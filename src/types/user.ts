export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
  newPassword?: string;
}
