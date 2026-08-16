import api from './api';
import { ENDPOINTS } from '@/constants/endpoints';
import { TaskStatus } from '@/types/dashboard';

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  await api.put(ENDPOINTS.TASKS.UPDATE_STATUS(taskId), { status });
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(ENDPOINTS.TASKS.DELETE(taskId));
}
