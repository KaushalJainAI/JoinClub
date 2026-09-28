// Link previews and crawl hints.
//
// Club and opening links are shared on WhatsApp and Instagram, where a client-rendered
// page shows no title, no description and no picture. This route serves the same URLs as
// full HTML with Open Graph tags, so a crawler (and a chat app's unfurler) sees them.
//
// These are mounted under /preview because the SPA and the API are usually on different
// origins, and something has to route a public /clubs/:slug to the backend. Point the
// host at them (vercel.json in this repo does it for Vercel); see docs/runbooks/seo.md.
// People still get the SPA: the markup below is a shell that boots the same bundle, and
// anyone who is not a crawler is redirected to the frontend.
import express from "express";
import { Club } from "../model/club.model.js";
import { Opening, isOpen } from "../model/opening.model.js";
import { asyncHandler as h } from "../utils/http.js";
import { TZ } from "../utils/time.js";

export const previewRouter = express.Router();

const SITE = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
const SITE_NAME = "JoinClub PEC";

const escape = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const page = ({ title, description, path, image, type = "website" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(SITE + path)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(SITE + path)}">
${image ? `<meta property="og:image" content="${escape(image)}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
${image ? `<meta name="twitter:image" content="${escape(image)}">` : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="module" src="/src/main.jsx"></script>
</head>
<body><div id="root"></div></body>
</html>`;

// Only crawlers get the tags; everyone else is left to the SPA, which has a client router
// and would otherwise be told to reload.
const CRAWLER = /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|embedly|quora|pinterest|skypeuripreview/i;

const maybePreview = (build) => async (req, res) => {
  if (!CRAWLER.test(`${req.get("user-agent") || ""} ${req.get("bot") || ""}`)) return res.redirect(302, SITE + req.originalUrl);
  const meta = await build(req);
  if (!meta) return res.redirect(302, SITE + req.originalUrl);
  res.type("html").send(page(meta));
};

const IST = { timeZone: TZ, day: "numeric", month: "short", year: "numeric" };
const shortDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", IST) : "");

previewRouter.get(
  "/clubs/:slug",
  maybePreview(async (req) => {
    const club = await Club.findOne({ slug: String(req.params.slug).toLowerCase(), archivedAt: null })
      .select("name tagline summary about logo color")
      .lean();
    if (!club) return null;
    const about = Array.isArray(club.about) ? club.about.join(" ") : "";
    return {
      title: `${club.name}${club.tagline ? ` · ${club.tagline}` : ""} — ${SITE_NAME}`,
      description: (club.summary || about || `Clubs, openings and events at PEC. ${club.name} on ${SITE_NAME}.`).slice(0, 300),
      path: `/clubs/${club.slug}`,
      image: club.logo || undefined,
    };
  })
);

previewRouter.get(
  "/openings/:id",
  maybePreview(async (req) => {
    if (!/^[0-9a-f]{24}$/i.test(req.params.id)) return null;
    const opening = await Opening.findById(req.params.id).populate("club", "name slug logo color").lean();
    if (!opening) return null;
    const open = isOpen(opening);
    return {
      title: `${opening.title} · ${opening.club?.name || "Club"} — ${SITE_NAME}`,
      description:
        `${opening.description?.slice(0, 200) || ""}${open ? ` Applications close ${shortDate(opening.deadline)}.` : ""}`.trim(),
      path: `/openings/${opening._id}`,
      image: opening.club?.logo || undefined,
    };
  })
);

previewRouter.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /super\nDisallow: /profile\nSitemap: ${SITE}/sitemap.xml\n`);
});

previewRouter.get(
  "/sitemap.xml",
  h(async (req, res) => {
    const [clubs, openings] = await Promise.all([
      Club.find({ archivedAt: null }).select("slug updatedAt").lean(),
      Opening.find({ status: "open" }).select("_id updatedAt").lean(),
    ]);
    const urls = [
      { loc: "/", lastmod: null },
      { loc: "/clubs", lastmod: null },
      { loc: "/openings", lastmod: null },
      { loc: "/events", lastmod: null },
      ...clubs.map((c) => ({ loc: `/clubs/${c.slug}`, lastmod: c.updatedAt })),
      ...openings.map((o) => ({ loc: `/openings/${o._id}`, lastmod: o.updatedAt })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${escape(SITE + u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}</url>`)
  .join("\n")}
</urlset>`;
    res.type("application/xml").send(xml);
  })
);
