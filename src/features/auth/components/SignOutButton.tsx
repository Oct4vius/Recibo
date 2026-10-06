import { useMutation } from '@tanstack/react-query';
import { SkewButton } from '@/components/SkewButton';
import { signOut } from '../api';

export function SignOutButton() {
  const logout = useMutation({ mutationFn: signOut });
  return <SkewButton label="Cerrar sesión" variant="ghost" onPress={() => logout.mutate()} loading={logout.isPending} />;
}
