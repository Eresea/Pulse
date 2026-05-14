import { Redirect } from "expo-router";
import { useAppState } from "@/state/app-state";

export default function Index() {
  const { session } = useAppState();

  if (!session.isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)/inbox" />;
}
