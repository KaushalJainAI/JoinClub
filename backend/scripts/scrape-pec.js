// Scrapes club and society information from pec.ac.in into data/pec-clubs.json.
//
//   npm run scrape            use cached HTML where present
//   npm run scrape -- --fresh re-download every page
//
// The seed script reads the JSON, never the live site, so commit the JSON after
// reviewing it. Raw HTML is cached in scripts/.cache/ so re-runs are free.
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://pec.ac.in";
const CACHE_DIR = path.join(__dirname, ".cache");
const OUT_FILE = path.join(__dirname, "..", "data", "pec-clubs.json");
const FRESH = process.argv.includes("--fresh");
const USER_AGENT = "JoinClubPEC-scraper/1.0 (student project; 1 req/s)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// "Society Of Automotive Engineers (SAE)" -> "sae"; names without an acronym are slugified.
const clubSlug = (name) => {
  const acronym = name.match(/\(([A-Z][A-Za-z.&-]{1,10})\)/);
  return acronym ? acronym[1].toLowerCase().replace(/[^a-z0-9]/g, "") : slugify(name);
};

const absolute = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return BASE + (url.startsWith("/") ? url : `/${url}`);
};

const clean = (s) =>
  (s || "")
    .replace(/�/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// Disallow rules for "User-agent: *" from the site's robots.txt, fetched once.
let disallowed = null;
async function robotsDisallows() {
  if (disallowed) return disallowed;
  disallowed = [];
  try {
    const { data } = await axios.get(`${BASE}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, timeout: 15000, responseType: "text" });
    let appliesToUs = false;
    for (const raw of data.split(/\r?\n/)) {
      const line = raw.split("#")[0].trim();
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (/^user-agent$/i.test(key)) appliesToUs = value === "*";
      else if (appliesToUs && /^disallow$/i.test(key) && value) disallowed.push(value.replace(/\*.*$/, ""));
    }
  } catch (err) {
    console.warn(`Couldn't read robots.txt (${err.message}); continuing carefully.`);
  }
  return disallowed;
}

async function fetchPage(pathname) {
  const decoded = decodeURI(pathname).replace(/^https?:\/\/[^/]+/, "");
  if ((await robotsDisallows()).some((rule) => decoded.toLowerCase().startsWith(rule.toLowerCase()))) {
    console.warn(`  skipping ${decoded}: disallowed by robots.txt`);
    return "";
  }
  const file = path.join(CACHE_DIR, `${slugify(pathname) || "index"}.html`);
  if (!FRESH) {
    try {
      return await fs.readFile(file, "utf8");
    } catch {
      /* not cached yet */
    }
  }
  await sleep(1000);
  const url = absolute(encodeURI(decodeURI(pathname)));
  console.log(`GET ${url}`);
  const res = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT },
    timeout: 30000,
    responseType: "text",
    validateStatus: (s) => s < 500,
  });
  if (res.status >= 400) {
    console.warn(`  ${res.status} for ${url}`);
    return "";
  }
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(file, res.data);
  return res.data;
}

// "Secretary : Yuvraj Singh" -> { role: "Secretary", name: "Yuvraj Singh" }
function parseLeadership(lines) {
  const out = [];
  for (const line of lines) {
    const m = clean(line).match(/^([A-Za-z/ .-]+?)\s*:\s*(.+)$/);
    if (!m) continue;
    let role = clean(m[1]);
    const name = clean(m[2]);
    if (!name) continue;
    if (/^o\/?i$/i.test(role)) role = "Officer In-charge";
    out.push({ role, name });
  }
  return out;
}

// Pulls body paragraphs, list items and social links from a club's own page.
function parseDetailPage(html) {
  if (!html) return {};
  const $ = cheerio.load(html);
  const body = $(".node__content .field--name-body").first();
  if (!body.length) return {};

  const paragraphs = [];
  const bullets = [];
  const headings = [];
  body.find("p, li, h2, h3, h4").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = clean($(el).text());
    if (!text || text.length < 3) return;
    if (tag === "li") bullets.push(text);
    else if (/^h\d$/.test(tag) || /^[A-Z0-9 ?:'&,!-]{6,}$/.test(text)) headings.push(text.replace(/:$/, ""));
    else paragraphs.push(text);
  });

  const socials = {};
  const text = body.text();
  body.find("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (/instagram\.com/i.test(href)) socials.instagram = href;
    else if (/facebook\.com/i.test(href)) socials.facebook = href;
    else if (/youtube\.com|youtu\.be/i.test(href)) socials.youtube = href;
    else if (/linkedin\.com/i.test(href)) socials.linkedin = href;
    else if (/^mailto:/i.test(href)) socials.email = href.replace(/^mailto:/i, "");
  });
  const insta = text.match(/Instagram\s*:?\s*@([A-Za-z0-9_.]+)/i);
  if (insta && !socials.instagram) socials.instagram = `https://instagram.com/${insta[1]}`;
  const email = text.match(/[A-Za-z0-9._%+-]+@pec\.(?:edu\.in|ac\.in)/i);
  if (email && !socials.email) socials.email = email[0];

  const images = [];
  body.find("img[src]").each((_, img) => images.push(absolute($(img).attr("src"))));

  // Paragraphs that are only the leadership or socials footer are noise.
  const about = paragraphs.filter(
    (p) => !/^(secretary|joint secretary|o\/i|officer)/i.test(p) && !/learn more about the club from our socials/i.test(p)
  );

  return { about, bullets, headings, socials, images };
}

function parseCultural(html) {
  const $ = cheerio.load(html);
  const clubs = [];
  $(".card-outer-div").each((_, card) => {
    const c = $(card);
    const name = clean(c.find(".card-heading-div h5").text());
    if (!name) return;
    const style = c.find(".club-background").attr("style") || "";
    const cover = style.match(/url\('([^']+)'\)/);
    const info = c.find(".club-info-text");
    const leaders = [];
    info.eq(1).find("div").each((_, d) => leaders.push($(d).text()));
    clubs.push({
      name,
      category: "cultural",
      summary: clean(info.eq(0).text()),
      logo: absolute(c.find(".club-logo img").attr("src")),
      cover: cover ? absolute(cover[1]) : "",
      leadership: parseLeadership(leaders),
      detailPath: c.find("a.know-more-link").attr("href") || "",
      listedOn: `${BASE}/cultural-clubs`,
    });
  });
  return clubs;
}

function parseTechnical(html) {
  const $ = cheerio.load(html);
  const clubs = [];
  $(".nested-card").each((_, card) => {
    const c = $(card);
    const name = clean(c.find(".societyName").text());
    if (!name) return;
    const leaders = [];
    c.find(".cardfooter div").each((_, d) => {
      if (!$(d).children("div").length) leaders.push($(d).text());
    });
    const imgs = c.find(".carousel-item img").map((_, i) => absolute($(i).attr("src"))).get();
    clubs.push({
      name,
      category: "technical",
      summary: clean(c.find(".nested-card-text > div").first().text()),
      logo: imgs[0] || "",
      cover: "",
      gallery: imgs,
      leadership: parseLeadership(leaders),
      detailPath: c.find(".know-more a").attr("href") || "",
      listedOn: `${BASE}/students/technical-societies`,
    });
  });
  return clubs;
}

// NCC, NSS and Sports are described in paragraphs on the student-activities page.
function parseActivities(html) {
  const $ = cheerio.load(html);
  const wanted = { NCC: "ncc", NSS: "nss", SPORTS: "sports" };
  const out = [];
  $(".node__content .field--name-body p strong").each((_, strong) => {
    const title = clean($(strong).text()).toUpperCase();
    if (!wanted[title]) return;
    const para = $(strong).parent().nextAll("p").filter((_, p) => clean($(p).text()).length > 40).first();
    const link = para.find("a").attr("href") || "";
    out.push({
      name: { NCC: "National Cadet Corps (NCC)", NSS: "National Service Scheme (NSS)", SPORTS: "Sports Council" }[title],
      category: title === "SPORTS" ? "sports" : "social",
      summary: clean(para.text()).replace(/<<more>>/gi, "").replace(/\.$/, "") + ".",
      logo: "",
      cover: "",
      leadership: [],
      detailPath: link,
      listedOn: `${BASE}/tnp/student-activities`,
    });
  });
  return out;
}

// Societies that only appear in the site's Campus Life menu, not on the index pages.
// The display name comes from the page's <title>; `name` overrides it where that is unhelpful.
const MENU_ONLY = [
  { path: "/robotics", category: "technical", name: "Robotics Society" },
  { path: "/sme", category: "technical", name: "Society of Manufacturing Engineers (SME)" },
  { path: "/asps", category: "technical", name: "Astronomy & Space Physics Society (ASPS)" },
  { path: "/campus-life/aerospace-technical-society-ats", category: "technical", name: "Aerospace Technical Society (ATS)" },
  { path: "/campus-life/igs", category: "technical" },
  { path: "/nss", category: "social", name: "National Service Scheme (NSS)" },
  { path: "/eic", category: "technical", name: "Entrepreneurship and Incubation Cell (E-Cell)" },
];

async function parseMenuOnly(entry) {
  const html = await fetchPage(entry.path);
  if (!html) return null;
  const $ = cheerio.load(html);
  const title = clean($("title").text().split("|")[0]);
  const detail = parseDetailPage(html);
  const summary = detail.about?.find((p) => p.length > 60) || "";
  if (!summary) return null;
  return {
    name: entry.name || title,
    category: entry.category,
    summary: summary.length > 260 ? summary.slice(0, summary.lastIndexOf(".", 260) + 1) || summary.slice(0, 260) : summary,
    logo: detail.images?.[0] || "",
    cover: "",
    leadership: [],
    detailPath: entry.path,
    listedOn: absolute(entry.path),
  };
}

async function main() {
  const [cultural, technical, activities] = await Promise.all([
    fetchPage("/cultural-clubs"),
    fetchPage("/students/technical-societies"),
    fetchPage("/tnp/student-activities"),
  ]);

  const listed = [...parseTechnical(technical), ...parseCultural(cultural), ...parseActivities(activities)];
  for (const entry of MENU_ONLY) {
    const club = await parseMenuOnly(entry);
    if (!club) continue;
    const i = listed.findIndex((c) => c.detailPath === entry.path || c.name === club.name);
    // The index page's card wins, but a menu page fills in the detail link the card lacked.
    if (i >= 0) listed[i] = { ...club, ...listed[i], name: entry.name || listed[i].name, detailPath: listed[i].detailPath || entry.path };
    else listed.push(club);
  }
  console.log(`Found ${listed.length} clubs`);

  const clubs = [];
  for (const club of listed) {
    // Sequential on purpose: one request per second to be polite to the PEC server.
    const detailHtml = club.detailPath ? await fetchPage(club.detailPath) : "";
    const detail = parseDetailPage(detailHtml);
    clubs.push({
      slug: clubSlug(club.name),
      name: club.name,
      category: club.category,
      summary: club.summary,
      about: detail.about?.length ? detail.about : [club.summary],
      highlights: detail.bullets || [],
      headings: detail.headings || [],
      logo: club.logo,
      cover: club.cover || detail.images?.find((i) => /\.(jpe?g|png)$/i.test(i)) || "",
      gallery: [...new Set([...(club.gallery || []), ...(detail.images || [])])].slice(0, 8),
      leadership: club.leadership,
      socials: detail.socials || {},
      sourceUrl: club.detailPath ? absolute(club.detailPath) : club.listedOn,
      listedOn: club.listedOn,
    });
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(
    OUT_FILE,
    JSON.stringify({ scrapedAt: new Date().toISOString(), source: BASE, clubs }, null, 2)
  );
  console.log(`Wrote ${clubs.length} clubs to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
