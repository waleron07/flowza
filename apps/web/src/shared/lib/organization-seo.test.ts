import { afterEach, describe, expect, it } from "vitest";
import { syncOrganizationSeo } from "./organization-seo";

const organization = {
  id: "flowza-cafe",
  tenantId: 10,
  slug: "flowza-cafe",
  name: "Flowza Cafe",
  description: "Городское кафе",
  heroTitle: "Свежая выпечка и кофе",
  heroSubtitle: "Завтраки весь день",
  heroDescription: "Теплая витрина, десерты и кофе в центре города.",
  heroImageUrl: "https://example.com/hero.jpg",
  seoTitle: "Flowza Cafe SEO",
  seoDescription: "SEO описание Flowza Cafe",
  address: "Москва",
  phone: "+79990000000",
  timezone: "Europe/Moscow",
  deliveryFee: "150",
  minOrderAmount: "900",
};

describe("syncOrganizationSeo", () => {
  function ensureMetaDescription() {
    const existing = document.querySelector('meta[name="description"]');

    if (existing) {
      return existing;
    }

    const meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Flowza web storefront");
    document.head.appendChild(meta);

    return meta;
  }

  afterEach(() => {
    document.title = "web";
    const meta = ensureMetaDescription();
    meta.setAttribute("content", "Flowza web storefront");
  });

  it("проставляет seo title и description организации", () => {
    const meta = ensureMetaDescription();
    document.title = "web";

    const cleanup = syncOrganizationSeo(organization);

    expect(document.title).toBe("Flowza Cafe SEO");
    expect(meta.getAttribute("content")).toBe("SEO описание Flowza Cafe");

    cleanup();

    expect(document.title).toBe("web");
    expect(meta.getAttribute("content")).toBe("Flowza web storefront");
  });

  it("использует hero/description как fallback если seo поля пустые", () => {
    const meta = ensureMetaDescription();
    document.title = "web";

    syncOrganizationSeo({
      ...organization,
      seoTitle: null,
      seoDescription: null,
    });

    expect(document.title).toBe("Свежая выпечка и кофе");
    expect(meta.getAttribute("content")).toBe(
      "Теплая витрина, десерты и кофе в центре города.",
    );
  });
});
