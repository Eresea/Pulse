import { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { ArrowLeft, Search } from "lucide-react-native";
import { router } from "expo-router";
import { PageHeader } from "@/components/drawer-shell";
import { Screen, ScreenScrollView } from "@/components/screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAiDebugLogEntries } from "@/services/ai-debug-log";
import type { AiDebugLogEntry, AiDebugLogLevel, AiDebugLogSource } from "@/services/types";
import { useAppState } from "@/state/app-state";
import { useTheme } from "@/theme/theme";

const levels: ("all" | AiDebugLogLevel)[] = ["all", "debug", "info", "warn", "error"];
const sources: ("all" | AiDebugLogSource)[] = ["all", "pulse", "nexus"];

export default function AiDiagnosticsScreen() {
  const { aiDebug, actions } = useAppState();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("all");
  const [source, setSource] = useState<(typeof sources)[number]>("all");

  const filteredLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return aiDebug.logs.filter((entry) => {
      if (level !== "all" && entry.level !== level) {
        return false;
      }
      if (source !== "all" && entry.source !== source) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return logSearchText(entry).includes(needle);
    });
  }, [aiDebug.logs, level, query, source]);

  const exportLogs = () => {
    void Share.share({ message: formatAiDebugLogEntries(filteredLogs), title: "Pulse AI diagnostics" });
  };

  return (
    <Screen>
      <View className="flex-row items-center gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" className="ml-4 size-11 items-center justify-center rounded-full border border-border bg-card dark:border-neutral-800 dark:bg-black" onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={20} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <PageHeader title="AI Diagnostics" />
        </View>
      </View>
      <ScreenScrollView>
        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <Input icon={Search} value={query} onChangeText={setQuery} placeholder="Trace, event, model, status, text" autoCapitalize="none" autoCorrect={false} />
            <FilterRow label="Level" values={levels} selected={level} onSelect={setLevel} />
            <FilterRow label="Source" values={sources} selected={source} onSelect={setSource} />
            <View className="flex-row gap-2">
              <Button className="flex-1" variant="outline" onPress={exportLogs}>
                Export Visible
              </Button>
              <Button className="flex-1" variant="ghost" onPress={actions.clearAiDebugLogs}>
                Clear Logs
              </Button>
            </View>
            <Text className="text-xs text-muted-foreground dark:text-slate-400">
              Showing {filteredLogs.length} of {aiDebug.logs.length}
            </Text>
          </CardContent>
        </Card>

        <View className="gap-3">
          {filteredLogs.length ? filteredLogs.map((entry) => <LogEntry key={entry.id} entry={entry} />) : <Text className="text-sm text-muted-foreground dark:text-slate-400">No matching AI diagnostic logs.</Text>}
        </View>
      </ScreenScrollView>
    </Screen>
  );
}

function FilterRow<T extends string>({ label, values, selected, onSelect }: { label: string; values: readonly T[]; selected: T; onSelect: (value: T) => void }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-muted-foreground dark:text-slate-400">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((value) => (
          <Button key={value} variant={selected === value ? "default" : "outline"} onPress={() => onSelect(value)}>
            {value}
          </Button>
        ))}
      </View>
    </View>
  );
}

function LogEntry({ entry }: { entry: AiDebugLogEntry }) {
  return (
    <Card>
      <CardContent className="gap-2 pt-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge>{entry.level}</Badge>
          <Badge variant="secondary">{entry.source}</Badge>
          <Text className="text-sm font-semibold text-foreground dark:text-slate-100">{entry.event}</Text>
        </View>
        <Text className="text-xs text-muted-foreground dark:text-slate-400">{entry.timestamp}</Text>
        {entry.traceId ? <Text className="text-xs text-muted-foreground dark:text-slate-400">trace {entry.traceId}</Text> : null}
        {entry.modelId ? <Text className="text-xs text-muted-foreground dark:text-slate-400">model {entry.modelId}</Text> : null}
        {entry.message ? <Text className="text-sm text-foreground dark:text-slate-100">{entry.message}</Text> : null}
        {entry.metadata ? <Text className="font-mono text-xs text-muted-foreground dark:text-slate-400">{JSON.stringify(entry.metadata)}</Text> : null}
      </CardContent>
    </Card>
  );
}

function logSearchText(entry: AiDebugLogEntry) {
  return [entry.level, entry.source, entry.event, entry.traceId, entry.modelId, entry.message, JSON.stringify(entry.metadata ?? {})]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
