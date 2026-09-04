# PhotoLink

PhotoLink is a responsive public photographer availability directory, developed by Shivaram. Photographers can publish a profile with their name, studio, mobile number, camera model, location, profile photo, and password. They can later log in with their mobile number and password to open their private profile controls. Visitors can see the shared directory, filter by availability, and call a photographer directly.

## Run locally

Run the frontend and shared API in two terminals:

```bash
npm install
npm run server
npm run dev
```

Open `http://localhost:5173/` in a browser.

Profiles and availability changes are stored in shared server storage, so every browser connected to the same public website sees the same directory. Profiles remain available until their owner deletes them. Use `npm run build` to create a production build and `npm run lint` to check the code.

## Deploy to Netlify

This project includes a Netlify Function and Netlify Blobs storage for the shared directory. In Netlify, import this repository or drag the project folder into the deploy area. Netlify will use `netlify.toml`, build the site with `npm run build`, and publish `dist`.

After the first deploy, enable Netlify Blobs for the site so registrations persist across browsers and deployments.
