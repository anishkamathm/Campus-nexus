# Campus Nexus: interactive demo

A front-end demo for the Innovators Conclave 2026 problem statement PS-02, *The 20-Minute Problem*.
It shows both a student journey and an admin/faculty journey, using sample data:

- **Sign in**: a simple login screen with a Demo Student and a Demo Admin account, so either side of the app can be tried instantly.
- **Ask** (student): type what you need and the page opens the right area.
- **Permissions and documents** (student): whom to ask, when, how, where, and which papers to carry, plus whether that approver is available right now and their cabin. Small requests (like a bonafide certificate or a short leave) can be sent and approved on WhatsApp in one tap; major requests (like a hackathon NOC) must be done in person.
- **Library** (student): check whether a book or resource is available, get an alert when a copy comes back, or ask about it on WhatsApp.
- **Lab equipment** (student): generate a QR for a borrow of 1 to 24 hours. Short borrows (4 hours or under) can also be requested on WhatsApp; longer ones need an in-person sign-out. A generated QR stops working 2 hours after it's created.
- **Approvals / Equipment desk / Library desk** (admin): approve or decline WhatsApp requests, scan a student's QR to record a borrowing, and mark library items as returned.

Everything runs in the browser. There is no server, no build step and no real account system — the login is a demo-only role picker. Data is saved in your browser's `localStorage`, so it survives a refresh. Use **Reset demo data** in the footer to start over (this also signs you out).

## Run it in VS Code

1. Open this folder in VS Code (`File > Open Folder`).
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` and choose **Open with Live Server**.

You can also just double-click `index.html`. Or, from a terminal in this folder:

```bash
python -m http.server 5500
# then open http://localhost:5500
```

The page loads two Google Fonts. Without internet it falls back to system fonts and still works.

## Upload to GitHub

```bash
git init
git add .
git commit -m "Add campus resource platform demo"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

To get a live link: on GitHub, open **Settings > Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. All paths are relative, so it works as is.

## Project structure

```
index.html          Page shell
css/styles.css      All styling
js/data.js          Sample procedures, books and equipment (edit this first)
js/app.js           Views, state and interactions
js/vendor/qrcode.js QR code generator (qrcode-generator by Kazuhiko Arase, MIT license)
```

## Make it yours

- **App name:** change `APP_NAME` in `js/data.js`.
- **Real procedures, books and equipment:** edit the lists in `js/data.js`. The Ask box matches the `keywords` and `tags` you give each entry.
- **Faculty names:** the demo uses roles such as "Class Coordinator" so no real person is named.

## What is simulated

| Feature | In this demo | In a real build |
| --- | --- | --- |
| Login | A role picker with a Demo Student and a Demo Admin account, no password | Real accounts (college SSO or email/password) with each person seeing only their own data |
| WhatsApp approval and requests | On-screen phone bubbles, and `wa.me` links that open your own WhatsApp with a prefilled message | WhatsApp Business Cloud API with Approve and Decline reply buttons, and a backend that receives the tap |
| QR scan and expiry | A button simulates the in-charge's scan; expiry is checked against the time the QR was generated | Browser camera scanning (for example `html5-qrcode`) plus a database, with the same 2-hour expiry enforced server-side |
| Faculty availability | A fixed weekly schedule per approver in `js/data.js`, checked against the browser's clock | A calendar or timetable integration that reflects real, day-to-day changes |
| Library returns | The admin's "Mark one returned" button on the Library desk | A job that watches the library system and sends the alert |
| Data | Sample data in `js/data.js`, shared between the student and admin views through `localStorage` | A database such as Supabase or PostgreSQL |

## Ideas for next steps

- Replace the demo login with real accounts, so each student and faculty member sees only their own requests.
- Store requests and borrow logs in a database so the student and admin views share real, live data instead of one browser's `localStorage`.
- Let the faculty scan QR codes with the device camera.
- Send real WhatsApp messages through the WhatsApp Business Cloud API instead of the wa.me simulation.
- Rank results by availability, distance and urgency, as the handbook asks.
