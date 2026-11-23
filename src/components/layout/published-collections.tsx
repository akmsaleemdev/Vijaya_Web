import Markdown from "react-markdown";
import { siteContent } from "@/lib/content";

const sections = [
  ["collections.testimonials", "Testimonials"],
  ["collections.offers", "Offers and packages"],
  ["collections.team", "The VIJAYA team"],
  ["collections.awards", "Awards"],
  ["collections.news", "News"],
] as const;

export async function PublishedCollections() {
  const lists = await Promise.all(sections.map(([key]) => siteContent(key)));
  return sections.map(([key, title], index) => {
    const rows = lists[index];
    if (!rows?.length) return null;
    return <section className="container-editorial py-12" key={key}>
      <h2 className="h-section">{title}</h2>
      <div className="grid gap-6 mt-6 md:grid-cols-3">{rows.map((item, position) => <article key={item.title + position} className="card-editorial p-6">
        <h3 className="h-sub">{item.title}</h3>
        {key === "collections.news" ? <Markdown skipHtml>{item.body}</Markdown> : <p className="mt-3 text-stone">{item.body}</p>}
      </article>)}</div>
    </section>;
  });
}
