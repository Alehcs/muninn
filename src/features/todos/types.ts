export interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TodoInput {
  title: string;
  notes?: string;
  orderIndex?: number;
}
