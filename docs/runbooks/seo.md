# Link previews, robots.txt and sitemap.xml

Club and opening links get shared on WhatsApp and Instagram. The frontend is a
client-rendered SPA, so without this a shared link shows the same blank title and no
picture for every club.

The backend solves this with `backend/routes/preview.route.js`. It serves:

| Backend path | Public path it should answer |
|---|---|
| `/preview/clubs/:slug` | `/clubs/:slug` |
| `/preview/openings/:id` | `/openings/:id` |
| `/preview/robots.txt` | `/robots.txt` |
| `/preview/sitemap.xml` | `/sitemap.xml` |

It only does this **for crawlers** (WhatsApp, Slack, Discord, Twitter, Google). Anyone else
gets a 302 to the frontend, so a person clicking the link sees the SPA as usual. That
also means the auth cookie can stay `SameSite=Lax`, because the browser only ever talks to
one origin.

## Vercel (the frontend)

`frontend/vercel.json` already contains the rewrites. Set `API` in the Vercel project to
the backend origin, for example `https://joinclub-api.onrender.com`. The `/api/*` rewrite
there is what lets the frontend and API share an origin.

## Nginx (if you host the frontend yourself)

```nginx
server {
  server_name joinclub.example.com;

  # Link previews: crawlers get HTML with Open Graph tags, people get redirected on.
  location ~ ^/clubs/[^/]+$   { proxy_pass http://127.0.0.1:8000/preview/clubs/;  include /etc/nginx/proxy_params; }
  location ~ ^/openings/[^/]+$ { proxy_pass http://127.0.0.1:8000/preview/openings/; include /etc/nginx/proxy_params; }
  location = /robots.txt     { proxy_pass http://127.0.0.1:8000/preview/robots.txt;    include /etc/nginx/proxy_params; }
  location = /sitemap.xml    { proxy_pass http://127.0.0.1:8000/preview/sitemap.xml;   include /etc/nginx/proxy_params; }

  location /api/ { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_params; }
  location /     { root /srv/joinclub/dist; try_files $uri /index.html; }   # the SPA
}
```

The `proxy_params` include must forward the `User-Agent`, or every request looks like a
person and gets redirected.

## Checking it worked

```bash
curl -s -A "facebookexternalhit/1.1" https://joinclub.example.com/clubs/ieee | grep -o '<meta property="og:[^>]*>'
curl -s https://joinclub.example.com/robots.txt
curl -s https://joinclub.example.com/sitemap.xml | head
# and, for a person:
curl -sI https://joinclub.example.com/clubs/ieee | head -1     # expect: HTTP/2 302
```

Then paste a club link into a WhatsApp chat and check the preview. Caches are slow: WhatsApp
and Facebook cache previews for days, so test with a club you have not shared before.
