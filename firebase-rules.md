# Firebase Security Rules (Production)

Deploy these rules via the Firebase Console or `firebase deploy --only firestore:rules,database`.

---

## Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helper functions ──────────────────────────────────
    function isAuth() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return request.auth.uid == uid;
    }

    function isMember(roomId) {
      return request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.members;
    }

    function isRoomOwner(roomId) {
      return request.auth.uid == get(/databases/$(database)/documents/rooms/$(roomId)).data.ownerId;
    }

    // Validate string field exists and is within size bounds
    function validString(field, minLen, maxLen) {
      return field is string && field.size() >= minLen && field.size() <= maxLen;
    }

    // ─── Rooms ─────────────────────────────────────────────
    match /rooms/{roomId} {

      // Any authenticated user can read rooms they are a member of
      allow read: if isAuth() && request.auth.uid in resource.data.members;

      // Authenticated users can create rooms
      allow create: if isAuth()
        && validString(request.resource.data.name, 2, 50)
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.members is list
        && request.auth.uid in request.resource.data.members
        && request.resource.data.membersCount is int
        && request.resource.data.isActive is bool;

      // Members can update (join), owner can update anything
      allow update: if isAuth() && (
        // Room owner can update any field
        isRoomOwner(roomId) ||
        // Members can update limited fields (e.g., joining/pinning)
        (isMember(roomId) && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['members', 'membersCount', 'pinnedMessages']))
      );

      // Only room owner can delete
      allow delete: if isAuth() && isRoomOwner(roomId);

      // ─── Messages subcollection ──────────────────────────
      match /messages/{messageId} {
        allow read: if isAuth() && isMember(roomId);

        // Members can create messages with required fields
        allow create: if isAuth()
          && isMember(roomId)
          && request.resource.data.senderId == request.auth.uid
          && validString(request.resource.data.type, 1, 20)
          && request.resource.data.text is string
          && request.resource.data.text.size() <= 5000;

        // Only message sender can update (reactions allowed by members)
        allow update: if isAuth() && isMember(roomId);

        // Only message sender or room owner can delete
        allow delete: if isAuth()
          && (resource.data.senderId == request.auth.uid || isRoomOwner(roomId));
      }

      // ─── Tasks subcollection ─────────────────────────────
      match /tasks/{taskId} {
        allow read: if isAuth() && isMember(roomId);

        allow create: if isAuth()
          && isMember(roomId)
          && request.resource.data.createdBy == request.auth.uid
          && validString(request.resource.data.text, 1, 200)
          && request.resource.data.completed is bool;

        allow update: if isAuth() && isMember(roomId)
          && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['completed']);

        allow delete: if isAuth()
          && (resource.data.createdBy == request.auth.uid || isRoomOwner(roomId));
      }

      // ─── AI Chat subcollection ───────────────────────────
      match /ai-chat/{messageId} {
        allow read: if isAuth() && isMember(roomId);

        allow create: if isAuth()
          && isMember(roomId)
          && request.resource.data.content is string
          && request.resource.data.content.size() <= 10000
          && request.resource.data.role in ['user', 'assistant'];

        allow update, delete: if false; // AI chat is append-only
      }

      // ─── Notes subcollection ─────────────────────────────
      match /notes/{noteId} {
        allow read: if isAuth() && isMember(roomId);
        allow create, update: if isAuth() && isMember(roomId)
          && request.resource.data.keys().hasAll(['content', 'lastEditedBy'])
          && request.resource.data.content is string
          && request.resource.data.content.size() <= 100000; // 100KB max

        allow delete: if isAuth() && isRoomOwner(roomId);
      }

      // ─── Typing indicators ──────────────────────────────
      match /typing/{userId} {
        allow read: if isAuth() && isMember(roomId);
        allow write: if isAuth() && isOwner(userId) && isMember(roomId);
      }
    }

    // ─── User profiles ─────────────────────────────────────
    match /users/{userId} {
      allow read: if isAuth();
      allow create, update: if isAuth() && isOwner(userId);
      allow delete: if false;
    }

    // Deny everything else by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Realtime Database Rules

```json
{
  "rules": {
    "presence": {
      "$roomId": {
        "$userId": {
          // Users can only write their own presence
          ".read": "auth != null",
          ".write": "auth != null && auth.uid === $userId",
          ".validate": "newData.hasChildren(['online', 'lastSeen', 'displayName'])",
          "online": {
            ".validate": "newData.isBoolean()"
          },
          "lastSeen": {
            ".validate": "newData.val() === now || newData.isNumber()"
          },
          "displayName": {
            ".validate": "newData.isString() && newData.val().length <= 100"
          },
          "photoURL": {
            ".validate": "newData.isString() || newData.val() === null"
          },
          "isIdle": {
            ".validate": "newData.isBoolean()"
          },
          "status": {
            ".validate": "newData.isString() && newData.val().length <= 100"
          },
          "typingSpeed": {
            ".validate": "newData.isNumber()"
          }
        }
      }
    },
    // Deny everything else
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

---

## Recommended Composite Indexes

Create these in the Firebase Console under Firestore > Indexes:

| Collection | Fields | Order |
|---|---|---|
| `rooms/{roomId}/messages` | `createdAt` | Ascending |
| `rooms/{roomId}/tasks` | `createdAt` | Descending |
| `rooms/{roomId}/ai-chat` | `timestamp` | Ascending |
| `rooms` | `members` (Array), `createdAt` | Descending |

> [!NOTE]
> Single-field indexes are created automatically by Firestore. The composite indexes above are only needed if you query on multiple fields simultaneously.
