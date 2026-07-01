### Notification System Design
## Stage 1: API Design & Real-Time Setup

### Core Actions
*   **Get Notifications**: Fetch the list of notifications for a student (allows paging, limit, and filtering by category).
*   **Mark as Read**: Mark specific notifications as read so they don't show up as new.
*   **Create Notification (Admin)**: Let school staff send out a new notification to students.

### Simple API Layouts
*   `GET /api/v1/notifications?page=1&limit=10&type=Placement`
    *   **Response**: A list of notifications, along with the total count and pages.
*   `PATCH /api/v1/notifications/read`
    *   **Request**: A list of notification IDs: `{ "notification_ids": ["id-123"] }`
*   `POST /api/v1/notifications` (Admin only)
    *   **Request**: `{ "type": "Placement", "message": "Company X is hiring!" }`

### Real-Time Delivery (Server Streams)
We will use **Server Streams** (technically called Server-Sent Events). 
*   **Why?** It lets the server push notifications to the student's browser as soon as they happen. It is a one-way street (server to browser), which is all we need. It is simple, handles auto-reconnections automatically if the internet drops, and works over normal web connections.

---

## Stage 2: Database Design

### Database Choice: PostgreSQL
We recommend using **PostgreSQL** because it is a standard database that organizes data using tables and relations.
*   **Why?** Since many notifications are sent to all 50,000 students, we only save the message text once in a main `notifications` table. We then use a helper table to map which student has read which notification. This saves massive amounts of storage space.

### Tables
*   `students`: ID, Name, Email
*   `notifications`: ID, Type (Event, Result, or Placement), Message, Date Sent
*   `student_notifications` (The mapping table): Student ID, Notification ID, Is Read (Yes/No)

### Handling Huge Scale (50M+ Rows)
If the database grows very large, we can keep it fast by:
1.  **Splitting Tables (Partitioning)**: Break the huge mapping table into smaller, manageable chunks based on Student IDs or months.
2.  **Quick Badge Counts (Caching)**: Instead of counting unread notifications from the database every time a page loads, save the count in a fast temporary memory store (like Redis) and update it only when a message is read or sent.
3.  **Read-Only Copies**: Create secondary copies of the database just for reading notification lists, keeping the main database free to handle updates and new messages.

### Database Queries
*   **Get Unread Messages**: Search the mapping table for a student's unread rows and fetch the details from the main notifications table.
*   **Mark Message as Read**: Update the "Is Read" column to "Yes" for that student and message ID.

---

## Stage 3: Query & Indexing

Consider this database search query:
`SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;`

### Is this query accurate?
*   Yes, it works if the database is designed in a flat way (where every notification is duplicated for every student). However, fetching all columns (`*`) is bad practice for speed.

### Why is it slow?
1.  **Checking everything**: Without a guide or pointer (called an index), the database has to scan all 5,000,000 rows one by one to find student `1042`'s unread messages.
2.  **Sorting from scratch**: Sorting the results by date takes extra time and computer memory.

### Is indexing every column a good idea?
*   **No, it is a very bad idea.**
    1.  **Slower Saves**: Every time you save a new notification, the database has to update every single index.
    2.  **Disk Bloat**: Indexes take up space. Indexing everything can make the database twice as large.
    3.  **Inefficient**: Separate indexes don't help much when you are filtering by multiple fields at once (like student ID *and* unread status).

### The Fix (Combined Index):
We should create a single combined index on the three columns we search and sort by:
```sql
CREATE INDEX idx_student_unread_created ON notifications(studentID, isRead, createdAt);
```
This acts like a pre-sorted catalog, making the search take less than a millisecond.

### Find Placement Notifications in the Last 7 Days:
```sql
SELECT DISTINCT studentID FROM notifications 
WHERE notificationType = 'Placement' AND createdAt >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: High Load Strategies

What to do when 50,000 students pull notifications at the exact same time:

*   **Fast Memory Cache (Redis)**: Save the recent feed in high-speed temporary memory. It responds in less than 2 milliseconds, keeping load off the main database.
*   **Smart Refresh (ETags)**: The browser asks "has anything changed?". The server checks in a split second and says "No" (using a 304 code) without loading or sending the data again.
*   **Live Streaming**: Stream messages live. No polling or reloading needed.
*   **Database Copies**: Spread the read queries across multiple database servers.

---

## Stage 5: Asynchronous Bulk Delivery

### Shortcomings of the Simple Loop
If we loop through 50,000 students one-by-one:
*   **It takes too long**: Sending emails and saving to the database takes time. Doing this 50,000 times will take hours. The web page will time out or crash.
*   **One crash stops everything**: If sending an email fails for student #200, the whole process stops, and the remaining 49,800 students get nothing.
*   **Database overload**: Asking the database to save 50,000 individual times in a row will slow down the entire system.

### Redesign: Background Queues
Instead of processing the notifications immediately during the web request, we save the message details, queue the task in the background, and immediately tell the Admin "Successfully Queued". 

*   **Should saving to the DB and sending emails happen together?**
    **No.** Email APIs are external and can fail or be slow. Save the notification status to the database first, and let a separate background worker handle the emails. If an email fails, the worker can retry it later without affecting the database.

---

## Stage 6: Priority Inbox Algorithm

### Priority Score
We assign simple points to each category:
*   `Placement` = 3 points
*   `Result` = 2 points
*   `Event` = 1 point

### Sorting Strategy
We sort messages first by their category points (highest points on top), and then by how new they are (newest first). This keeps placements on top, followed by exam results, then events.

If we want old placements to drop below brand-new exam results over time, we use a decay formula:
$$Score = Points \times 24 - AgeInHours^{1.5}$$

---

## Stage 7: Frontend & Logging Alignment

1.  **Port Setting**: Configure the frontend app to run on port `3000`.
2.  **Visual Design**: Use Material UI elements (cards, badges, lists) for a clean look.
3.  **Read States**: Since the API is read-only for this demo, we will remember which notifications the user clicked by saving them in the browser's local memory (`localStorage`).
4.  **Logging**: Put a wrapper around our API calls to log errors and traffic to a file for debugging.
