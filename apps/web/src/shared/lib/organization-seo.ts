import type { Organization } from "../types/organization";

export function syncOrganizationSeo(organization: Organization | null) {
  if (!organization) {
    return () => undefined;
  }

  const previousTitle = document.title;
  const existingMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  const createdMeta = existingMeta ? null : document.createElement("meta");
  const descriptionMeta = existingMeta ?? createdMeta;
  const previousDescription = descriptionMeta?.getAttribute("content");

  if (createdMeta) {
    createdMeta.setAttribute("name", "description");
    document.head.appendChild(createdMeta);
  }

  document.title =
    organization.seoTitle ??
    organization.heroTitle ??
    `${organization.name} | Flowza`;

  descriptionMeta?.setAttribute(
    "content",
    organization.seoDescription ??
      organization.heroDescription ??
      organization.description ??
      "Flowza storefront",
  );

  return () => {
    document.title = previousTitle;

    if (createdMeta) {
      createdMeta.remove();
      return;
    }

    if (descriptionMeta && typeof previousDescription === "string") {
      descriptionMeta.setAttribute("content", previousDescription);
    }
  };
}
