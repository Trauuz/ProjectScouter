type DeleteAuthUser = (
  userId: string,
) => Promise<{ error: unknown | null }>;

function isAlreadyAbsent(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") {
    return false;
  }

  const error = reason as { code?: unknown; status?: unknown };
  return error.status === 404 || error.code === "user_not_found";
}

export async function deleteSupabaseAuthUser(
  userId: string,
  deleteUser: DeleteAuthUser,
): Promise<void> {
  const { error } = await deleteUser(userId);
  if (!error || isAlreadyAbsent(error)) {
    return;
  }

  throw error;
}
