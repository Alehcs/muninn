import type { Roadmap, RoadmapItem, RoadmapSection } from "../types";

export const DEFAULT_ROADMAP_ID = "roadmap-world-class-software-engineer";
export const ROADMAP_TITLE = "World-Class Software Engineer Roadmap";

const DEFAULT_CREATED_AT = "2020-01-01T00:00:00.000Z";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const defaultRoadmap: Roadmap = {
  id: DEFAULT_ROADMAP_ID,
  title: ROADMAP_TITLE,
  description:
    "Fundamentos, sistemas, producto y carrera en un camino tranquilo.",
  createdAt: DEFAULT_CREATED_AT,
  updatedAt: DEFAULT_CREATED_AT,
};

const sectionNames = [
  "Computer Science Foundations",
  "Data Structures & Algorithms",
  "Backend Engineering",
  "Frontend & Product Engineering",
  "Databases & Data Engineering",
  "Cloud, DevOps & Systems",
  "AI/ML Foundations",
  "Portfolio & Career",
];

export const DEFAULT_ROADMAP_SECTIONS: RoadmapSection[] = sectionNames.map(
  (name, index) => ({
    id: `section-${slugify(name)}`,
    roadmapId: DEFAULT_ROADMAP_ID,
    name,
    order: index + 1,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  }),
);

interface DefaultRoadmapItemSeed {
  section: string;
  title: string;
  type?: string;
}

const seeds: DefaultRoadmapItemSeed[] = [
  {
    section: "Computer Science Foundations",
    title: "CS50: Introduction to Computer Science",
    type: "Course",
  },
  { section: "Computer Science Foundations", title: "Learn C fundamentals", type: "Skill" },
  { section: "Computer Science Foundations", title: "Learn Python fundamentals", type: "Skill" },
  { section: "Computer Science Foundations", title: "Learn SQL fundamentals", type: "Skill" },
  { section: "Computer Science Foundations", title: "Learn basic web fundamentals", type: "Skill" },
  { section: "Computer Science Foundations", title: "Study data structures basics", type: "Topic" },
  { section: "Computer Science Foundations", title: "Study algorithms basics", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "NeetCode Roadmap", type: "Roadmap" },
  { section: "Data Structures & Algorithms", title: "Arrays & Hashing", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Two Pointers", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Sliding Window", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Stack", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Binary Search", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Linked List", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Trees", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Graphs", type: "Topic" },
  { section: "Data Structures & Algorithms", title: "Dynamic Programming", type: "Topic" },
  { section: "Backend Engineering", title: "REST APIs", type: "Skill" },
  { section: "Backend Engineering", title: "Authentication and authorization", type: "Skill" },
  { section: "Backend Engineering", title: "SQL modeling", type: "Skill" },
  { section: "Backend Engineering", title: "Transactions", type: "Topic" },
  { section: "Backend Engineering", title: "Caching basics", type: "Topic" },
  { section: "Backend Engineering", title: "Background jobs / queues", type: "Topic" },
  { section: "Backend Engineering", title: "Testing APIs", type: "Practice" },
  { section: "Backend Engineering", title: "Observability basics", type: "Topic" },
  { section: "Frontend & Product Engineering", title: "React advanced patterns", type: "Skill" },
  { section: "Frontend & Product Engineering", title: "State management", type: "Skill" },
  { section: "Frontend & Product Engineering", title: "Forms and validation", type: "Skill" },
  { section: "Frontend & Product Engineering", title: "Accessibility basics", type: "Topic" },
  { section: "Frontend & Product Engineering", title: "Component architecture", type: "Skill" },
  { section: "Frontend & Product Engineering", title: "UI polish", type: "Practice" },
  { section: "Databases & Data Engineering", title: "PostgreSQL fundamentals", type: "Skill" },
  { section: "Databases & Data Engineering", title: "Indexes and query optimization", type: "Topic" },
  { section: "Databases & Data Engineering", title: "Database migrations", type: "Skill" },
  { section: "Databases & Data Engineering", title: "Data modeling", type: "Skill" },
  { section: "Databases & Data Engineering", title: "ETL basics", type: "Topic" },
  { section: "Databases & Data Engineering", title: "CSV/JSON data pipelines", type: "Practice" },
  { section: "Cloud, DevOps & Systems", title: "Docker", type: "Skill" },
  { section: "Cloud, DevOps & Systems", title: "CI/CD", type: "Skill" },
  { section: "Cloud, DevOps & Systems", title: "AWS fundamentals", type: "Skill" },
  { section: "Cloud, DevOps & Systems", title: "Serverless fundamentals", type: "Topic" },
  { section: "Cloud, DevOps & Systems", title: "Logging and monitoring", type: "Skill" },
  { section: "Cloud, DevOps & Systems", title: "Basic system design", type: "Topic" },
  { section: "AI/ML Foundations", title: "Python data stack", type: "Skill" },
  { section: "AI/ML Foundations", title: "NumPy/Pandas", type: "Skill" },
  { section: "AI/ML Foundations", title: "PyTorch basics", type: "Skill" },
  { section: "AI/ML Foundations", title: "Computer vision basics", type: "Topic" },
  { section: "AI/ML Foundations", title: "Model evaluation", type: "Topic" },
  { section: "AI/ML Foundations", title: "ONNX/export basics", type: "Topic" },
  { section: "Portfolio & Career", title: "Polish Muninn", type: "Project" },
  { section: "Portfolio & Career", title: "Polish Auralis/Coronium", type: "Project" },
  { section: "Portfolio & Career", title: "Polish ANOMALON/Auralis Discovery", type: "Project" },
  { section: "Portfolio & Career", title: "Update CV", type: "Career" },
  { section: "Portfolio & Career", title: "Update LinkedIn", type: "Career" },
  { section: "Portfolio & Career", title: "Prepare interview stories", type: "Career" },
  { section: "Portfolio & Career", title: "Practice technical interviews", type: "Practice" },
];

function getSection(name: string): RoadmapSection {
  const section = DEFAULT_ROADMAP_SECTIONS.find((item) => item.name === name);
  if (!section) throw new Error(`Missing default roadmap section: ${name}`);
  return section;
}

export const defaultRoadmapItems: RoadmapItem[] = seeds.map((seed, index) => {
  const section = getSection(seed.section);
  const sectionItemsBefore = seeds
    .slice(0, index)
    .filter((item) => item.section === seed.section).length;

  return {
    id: `roadmap-${slugify(seed.section)}-${slugify(seed.title)}`,
    roadmapId: DEFAULT_ROADMAP_ID,
    sectionId: section.id,
    section: section.name,
    sectionOrder: section.order,
    title: seed.title,
    type: seed.type,
    completed: false,
    orderIndex: sectionItemsBefore + 1,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
});
