import { BellRing, Inbox } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const placeholderEvents = [
  { id: "chat", title: "Chat messages", source: "chatHub", state: "ready" },
  { id: "bellum", title: "Bellum session updates", source: "bellumHub", state: "stub" },
  { id: "push", title: "Background notifications", source: "FCM", state: "pending config" }
];

export default function InboxScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="gap-4 px-4 pb-8 pt-3">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Inbox</Text>
          <Text className="text-base text-muted-foreground">
            Event streams will land here before being routed into focused screens.
          </Text>
        </View>

        {placeholderEvents.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <BellRing color="#0f766e" size={18} />
                  <CardTitle>{event.title}</CardTitle>
                </View>
                <Badge variant={event.state === "ready" ? "default" : "outline"}>{event.state}</Badge>
              </View>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-muted-foreground">Source: {event.source}</Text>
            </CardContent>
          </Card>
        ))}

        <View className="items-center gap-2 rounded-md border border-dashed border-border bg-card p-6">
          <Inbox color="#64748b" size={24} />
          <Text className="text-sm font-medium text-foreground">No live events yet</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Connect a signed-in Roots user and registered device to receive realtime activity.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
