# API Reference

## Authentication

All API endpoints require authentication except login.

### Headers

```
Cookie: authjs.session-token=...
```

## Endpoints

### 🔐 Authentication

#### POST /api/auth/signin

Login with credentials

**Request:**

```json
{
    "email": "admin@wedding.com",
    "password": "password123"
}
```

**Response:**

```json
{
    "user": {
        "id": "...",
        "name": "Admin Name",
        "email": "admin@wedding.com",
        "role": "ADMIN"
    }
}
```

---

### 👥 Guests

#### GET /api/guests/export

Export guests for WhatsApp integration

**Query Parameters:**

-   `weddingId` (optional): Filter by wedding
-   `status` (optional): Filter by RSVP status (PENDING, ATTENDING, NOT_ATTENDING)
-   `format` (optional): Response format (json or csv, default: json)

**Examples:**

```bash
# Get all guests with phone numbers (JSON)
GET /api/guests/export

# Get guests for specific wedding
GET /api/guests/export?weddingId=abc123

# Get only attending guests
GET /api/guests/export?status=ATTENDING

# Export as CSV
GET /api/guests/export?format=csv

# Combined filters
GET /api/guests/export?weddingId=abc123&status=PENDING&format=json
```

**Response (JSON):**

```json
{
    "total": 25,
    "guests": [
        {
            "id": "...",
            "name": "John Doe",
            "phone": "+6281234567890",
            "email": "john@example.com",
            "wedding": {
                "name": "Ivan & Olivia",
                "slug": "ivan-olivia"
            },
            "rsvpStatus": "PENDING",
            "numberOfGuests": 2,
            "invitationSent": false,
            "invitationSentAt": null,
            "whatsappLink": "https://wa.me/6281234567890"
        }
    ]
}
```

**Response (CSV):**

```csv
Name,Phone,Email,Wedding,RSVP Status,Number of Guests,Notes
"John Doe",+6281234567890,john@example.com,"Ivan & Olivia",PENDING,2,"VIP Guest"
```

#### POST /api/guests

Create a new guest

**Request:**

```json
{
    "weddingId": "wedding-id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+6281234567890",
    "numberOfGuests": 2,
    "notes": "VIP Guest"
}
```

**Response:**

```json
{
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+6281234567890",
    "numberOfGuests": 2,
    "rsvpStatus": "PENDING",
    "notes": "VIP Guest",
    "weddingId": "...",
    "createdAt": "...",
    "updatedAt": "..."
}
```

#### POST /api/guests/import

Bulk import guests from CSV

**Request:**

```json
{
    "weddingId": "wedding-id",
    "guests": [
        {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+6281234567890",
            "numberOfGuests": "2",
            "notes": "VIP Guest"
        },
        {
            "name": "Jane Smith",
            "phone": "+6281234567891",
            "numberOfGuests": "1"
        }
    ]
}
```

**Response:**

```json
{
    "count": 2
}
```

#### PATCH /api/guests/[id]

Update a guest

**Request:**

```json
{
    "rsvpStatus": "ATTENDING",
    "invitationSent": true,
    "invitationSentAt": "2026-01-03T10:00:00Z"
}
```

**Response:**

```json
{
  "id": "...",
  "name": "John Doe",
  "rsvpStatus": "ATTENDING",
  "invitationSent": true,
  ...
}
```

#### DELETE /api/guests/[id]

Delete a guest

**Response:**

```json
{
    "success": true
}
```

---

### 👤 Users (Super Admin Only)

#### POST /api/users

Create a new user

**Request:**

```json
{
    "name": "Admin Name",
    "email": "admin@wedding.com",
    "password": "securepassword",
    "role": "ADMIN"
}
```

**Response:**

```json
{
    "id": "...",
    "name": "Admin Name",
    "email": "admin@wedding.com",
    "role": "ADMIN"
}
```

#### DELETE /api/users/[id]

Delete a user

**Response:**

```json
{
    "success": true
}
```

---

## WhatsApp Integration Examples

### Using WAHA (WhatsApp HTTP API)

#### 1. Get guests ready to send invitations

```bash
curl -X GET "http://localhost:3000/api/guests/export?status=PENDING" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN"
```

#### 2. Send WhatsApp message via WAHA

```bash
# For each guest from the export
curl -X POST "http://your-vps:3000/api/sendText" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "6281234567890@c.us",
    "text": "Hi John! You'\''re invited to Ivan & Olivia'\''s wedding! RSVP: https://ivan-olivia.wedding.com",
    "session": "default"
  }'
```

#### 3. Mark invitation as sent

```bash
curl -X PATCH "http://localhost:3000/api/guests/guest-id" \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN" \
  -d '{
    "invitationSent": true,
    "invitationSentAt": "2026-01-03T10:00:00Z"
  }'
```

### Automation Script Example

```javascript
// send-invitations.js
const fetch = require("node-fetch");

const DASHBOARD_URL = "http://localhost:3000";
const WAHA_URL = "http://your-vps:3000";
const SESSION_TOKEN = "your-session-token";

async function sendInvitations() {
    // 1. Get pending guests
    const response = await fetch(
        `${DASHBOARD_URL}/api/guests/export?status=PENDING`,
        {
            headers: {
                Cookie: `authjs.session-token=${SESSION_TOKEN}`,
            },
        }
    );
    const { guests } = await response.json();

    // 2. Send to each guest
    for (const guest of guests) {
        const message = `Hi ${guest.name}! 👰🤵\n\nYou're invited to ${guest.wedding.name}'s wedding!\n\nRSVP here: https://${guest.wedding.slug}.wedding.com`;

        try {
            // Send via WAHA
            await fetch(`${WAHA_URL}/api/sendText`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId: `${guest.phone.replace(/\+/g, "")}@c.us`,
                    text: message,
                    session: "default",
                }),
            });

            // Mark as sent
            await fetch(`${DASHBOARD_URL}/api/guests/${guest.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: `authjs.session-token=${SESSION_TOKEN}`,
                },
                body: JSON.stringify({
                    invitationSent: true,
                    invitationSentAt: new Date().toISOString(),
                }),
            });

            console.log(`✅ Sent to ${guest.name}`);

            // Wait 2 seconds between messages
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
            console.error(`❌ Failed for ${guest.name}:`, error);
        }
    }
}

sendInvitations();
```

---

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized

```json
{
    "error": "Unauthorized"
}
```

### 403 Forbidden

```json
{
    "error": "Forbidden"
}
```

### 500 Internal Server Error

```json
{
    "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production.

## CORS

Same-origin only. Configure CORS if accessing from different domain.
