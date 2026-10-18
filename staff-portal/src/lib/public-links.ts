import { PUBLIC_SITE_URL } from "@/lib/site-url";

export function newsPublicUrl(slug: string) {
  return `${PUBLIC_SITE_URL}/article.html?slug=${encodeURIComponent(slug)}`;
}

export function productPublicUrl(slug: string) {
  return `${PUBLIC_SITE_URL}/products.html#${encodeURIComponent(slug)}-details`;
}

export function projectPublicUrl(category: string) {
  return `${PUBLIC_SITE_URL}/project.html#${encodeURIComponent(category)}`;
}
