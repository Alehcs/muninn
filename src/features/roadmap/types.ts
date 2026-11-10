export interface Roadmap {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapSection {
  id: string;
  roadmapId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapItem {
  id: string;
  roadmapId: string;
  sectionId: string;
  section: string;
  sectionOrder: number;
  title: string;
  description?: string;
  type?: string;
  completed: boolean;
  orderIndex: number;
  notes?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RoadmapSectionGroup {
  section: RoadmapSection;
  items: RoadmapItem[];
  completed: number;
  total: number;
  percent: number;
}

export interface RoadmapProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface RoadmapInput {
  title: string;
  description?: string;
}

export interface RoadmapSectionInput {
  name: string;
  order?: number;
}

export interface RoadmapItemInput {
  sectionId: string;
  title: string;
  description?: string;
  type?: string;
  orderIndex?: number;
  notes?: string;
  url?: string;
}
