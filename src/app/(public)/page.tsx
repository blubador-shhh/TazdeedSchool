"use client";

import {
  AboutSection,
  AdmissionCta,
  EventsSection,
  FeaturesSection,
  GallerySection,
  HeroSection,
  NoticesSection,
  ProgramsSection,
  StatsSection,
  TestimonialsSection,
} from "@/components/homepage/sections";

/**
 * Public homepage — reconstructed section by section from the supplied design
 * reference (header, hero, statistics, feature cards, about, programmes,
 * notices, events, gallery, testimonials, footer). Every section is a real,
 * data-driven component; content comes from `publicSiteContent` and published
 * `notices` / `events` / `galleryItems` documents.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <AboutSection />
      <ProgramsSection />
      <NoticesSection />
      <EventsSection />
      <GallerySection />
      <TestimonialsSection />
      <AdmissionCta />
    </>
  );
}
