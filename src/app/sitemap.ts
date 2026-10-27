import { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/metadata';
import { BLOG_POSTS } from '@/lib/blogs';
import { TOOLS } from '@/lib/tools-catalog';
import { PUBLIC_ROUTES } from '@/lib/site-navigation';
import { CITY_TARGETS } from '@/lib/city-pages';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // Same list the header renders, so the sitemap cannot drift out of sync
  // with the site's own navigation.
  const staticPages = PUBLIC_ROUTES;

  // Generate sitemap entries
  const routes: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : path.includes('blog') ? 'weekly' : 'monthly',
    priority: path === '' ? 1.0 : path.includes('services') || path.includes('work') ? 0.9 : 0.8,
  }));

  // Add dynamic case study pages
  const caseStudies = ['healthtrack-pro']; // Add more as needed
  caseStudies.forEach((slug) => {
    routes.push({
      url: `${baseUrl}/work/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  BLOG_POSTS.forEach((post) => {
    routes.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // Location landing pages, plus the index that links them together.
  routes.push({
    url: `${baseUrl}/web-development-company`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  });

  CITY_TARGETS.forEach((target) => {
    routes.push({
      url: `${baseUrl}/web-development-company/${target.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  TOOLS.forEach((tool) => {
    routes.push({
      url: `${baseUrl}/popular-tools/${tool.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  });

  // Our own Android apps: landing page and the privacy policy Google Play links to.
  ['/apps/ultra-gfx-tool-pro', '/apps/ultra-gfx-tool-pro/privacy-policy'].forEach((path) => {
    routes.push({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  return routes;
}
