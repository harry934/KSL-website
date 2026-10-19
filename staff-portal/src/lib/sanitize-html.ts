import sanitizeHtml from "sanitize-html";

const ALLOWED = ["p", "br", "strong", "b", "em", "i", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a"];

/** Keeps the tags the story editor produces. Drops scripts and other markup. */
export function sanitizeRichHtml(input: string | null | undefined) {
  return sanitizeHtml(String(input || ""), {
    allowedTags: ALLOWED,
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          href: attribs.href,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    },
  });
}
