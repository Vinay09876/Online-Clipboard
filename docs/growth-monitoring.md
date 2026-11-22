# Growth monitoring (Step 8): a weekly routine

About **30 minutes once a week**, same day each week. Everything happens in Google Search
Console (search.google.com/search-console), property `vinaycode.com`.

## Honest expectations first

- A new domain usually takes **days to a few weeks** to show up in Google at all, and **3-6
  months** before search traffic means anything. That's normal, not a problem with the site.
- Early on you'll see **impressions** (your page was shown in results) long before **clicks**.
- Positions jump around a lot in the first months. Judge trends over 4+ weeks, not single days.
- No SEO trick shortens this. Useful pages, a technically clean site and patience do.

## The weekly routine

### 1. Indexing problems (5 minutes): **Indexing → Pages**
- **Indexed** should slowly grow toward the number of pages in the sitemap (6 pages + 12 guides = 18).
- Under **"Why pages aren't indexed"**:
  - *Discovered/Crawled – currently not indexed*: normal for a new site; Google hasn't decided yet. Wait.
  - *Page with redirect*: fine for `www.` and old `vercel.app` addresses (they redirect on purpose).
  - *Excluded by 'noindex' tag*: should only list preview/old addresses. **If a vinaycode.com page is
    listed, tell me** (something is wrong).
  - *Not found (404)*: open the URL; if it's a link we publish, fix the link.
  - *Server error (5xx)*: check the uptime monitor and Vercel logs.
- **Sitemaps**: status "Success", last read recently.

### 2. What people searched (10 minutes): **Performance → Search results**
Set the date range to **Last 28 days**, tick all four boxes (clicks, impressions, CTR, position).
- **Queries** tab: the words people typed. Sort by **Impressions**.
- **Pages** tab: which page Google showed.
- How to read it:
  - **Many impressions, few clicks, position 1-10**: the title/description in results may not
    match what people want. Try clearer page titles/descriptions.
  - **Impressions at position 11-30**: Google thinks you're relevant but not the best answer yet.
    Improving that guide (clearer steps, a missing detail people ask about) is often the best win.
  - **A query no page really answers** (e.g. "send file from laptop to iphone without cable"):
    a candidate for a new guide.

### 3. Experience (2 minutes): **Experience → Core Web Vitals** and **HTTPS**
Both should be "Good"/no issues. Real-user data only appears once there is enough traffic.

### 4. Write things down (5 minutes)
Keep a simple log (a note or spreadsheet): date, indexed pages, clicks, impressions, top 3
queries, anything fixed. Trends are easier to see over weeks.

## When to write a new guide

Only from **real queries** you see in Search Console:
- the query shows up repeatedly with impressions,
- no existing guide answers it well (otherwise improve that guide instead: two pages for one
  search intent compete with each other; our guide registry already enforces one `primaryQuery`
  per guide),
- you can write something genuinely useful and true (tested on real devices).

A realistic cadence: **one new or improved guide every 2-4 weeks**. Quality beats quantity.

## First backlinks: legitimate ways only

A backlink is another website linking to yours. A few honest ones help Google discover and
trust a new site:
- Your **GitHub repository README**: a short description and the link (if the repo is public).
- A **build write-up** on a developer blog (e.g. dev.to, Hashnode or your own blog): how you built
  it (Next.js, Supabase, strict CSP, rate limiting), with a link. Useful to others, so it's linked naturally.
- Your **profiles** (GitHub profile, LinkedIn, portfolio) linking to the site.
- Answering a real question on a forum/community **where a link genuinely helps the person**,
  following that community's rules about self-promotion.
- Showing it in communities that welcome side projects (e.g. "Show HN"-style posts), once.

**Never:** buy links, join link exchanges or "link farms", mass-post in comments, or use
"SEO packages" that promise backlinks. Google treats these as spam and can demote or remove the
whole site, which is far worse than having no links.

## When to tell me

- A vinaycode.com page is "Excluded by noindex", or the indexed count drops sharply.
- The uptime monitor reports downtime more than once.
- A query you'd like to target with a new guide (bring the query and its impressions).
