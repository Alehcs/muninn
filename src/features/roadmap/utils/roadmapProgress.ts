import type {
  RoadmapItem,
  RoadmapProgress,
  RoadmapSection,
  RoadmapSectionGroup,
} from "../types";

export function getRoadmapProgress(items: RoadmapItem[]): RoadmapProgress {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent };
}

export function groupRoadmapItems(
  sections: RoadmapSection[],
  items: RoadmapItem[],
): RoadmapSectionGroup[] {
  const groups = new Map<string, RoadmapItem[]>();

  for (const item of items) {
    groups.set(item.sectionId, [...(groups.get(item.sectionId) ?? []), item]);
  }

  return sections
    .map((section) => {
      const sectionItems = groups.get(section.id) ?? [];
      const progress = getRoadmapProgress(sectionItems);

      return {
        section,
        items: sectionItems,
        completed: progress.completed,
        total: progress.total,
        percent: progress.percent,
      };
    })
    .sort((left, right) => left.section.order - right.section.order);
}
