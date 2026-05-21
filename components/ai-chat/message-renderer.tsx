import type {
  BlockContent,
  Blockquote,
  Code,
  Delete,
  Emphasis,
  Heading,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
  Strong,
  Table,
  Text as MarkdownText,
  ThematicBreak
} from "mdast";
import { Fragment, ReactNode, useMemo } from "react";
import { Linking, Pressable, Text, TextStyle, View } from "react-native";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { useTheme } from "@/theme/theme";

type MessageRendererProps = {
  markdown: string;
  inverse?: boolean;
};

type RendererPalette = {
  background: string;
  border: string;
  codeBackground: string;
  foreground: string;
  link: string;
  muted: string;
  quoteBackground: string;
};

const allowedLinkProtocols = new Set(["https:", "http:", "mailto:", "tel:"]);
const parser = unified().use(remarkParse).use(remarkGfm);

export function MessageRenderer({ markdown, inverse = false }: MessageRendererProps) {
  const { colors, resolvedTheme } = useTheme();
  const content = markdown.trim();
  const palette: RendererPalette = {
    background: inverse ? colors.primary : colors.card,
    border: inverse ? "rgba(255,255,255,0.28)" : colors.border,
    codeBackground: inverse ? "rgba(255,255,255,0.16)" : resolvedTheme === "dark" ? "#111827" : "#f1f5f9",
    foreground: inverse ? colors.primaryForeground : colors.foreground,
    link: inverse ? colors.primaryForeground : colors.primary,
    muted: inverse ? colors.primaryForeground : colors.muted,
    quoteBackground: inverse ? "rgba(255,255,255,0.1)" : resolvedTheme === "dark" ? "#020617" : "#f8fafc"
  };

  const tree = useMemo(() => {
    try {
      return parser.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!content) {
    return null;
  }

  if (!tree) {
    return <PlainText content={content} palette={palette} />;
  }

  return <View style={{ maxWidth: "100%", gap: 8 }}>{tree.children.map((node, index) => renderRootNode(node, index, palette))}</View>;
}

function renderRootNode(node: RootContent, index: number, palette: RendererPalette): ReactNode {
  switch (node.type) {
    case "blockquote":
      return <BlockquoteNode key={index} node={node} palette={palette} />;
    case "code":
      return <CodeNode key={index} node={node} palette={palette} />;
    case "heading":
      return <HeadingNode key={index} node={node} palette={palette} />;
    case "list":
      return <ListNode key={index} node={node} palette={palette} />;
    case "paragraph":
      return <ParagraphNode key={index} node={node} palette={palette} />;
    case "table":
      return <TableNode key={index} node={node} palette={palette} />;
    case "thematicBreak":
      return <ThematicBreakNode key={index} node={node} palette={palette} />;
    case "html":
    case "yaml":
    case "definition":
    case "footnoteDefinition":
      return null;
    default:
      return <PlainText key={index} content={plainTextFromNode(node)} palette={palette} />;
  }
}

function renderBlockNode(node: BlockContent, index: number, palette: RendererPalette): ReactNode {
  return renderRootNode(node as RootContent, index, palette);
}

function ParagraphNode({ node, palette }: { node: Paragraph; palette: RendererPalette }) {
  return (
    <Text selectable style={textStyle(palette)}>
      {renderInlineChildren(node.children, palette)}
    </Text>
  );
}

function HeadingNode({ node, palette }: { node: Heading; palette: RendererPalette }) {
  const fontSize = node.depth === 1 ? 22 : node.depth === 2 ? 19 : 17;
  const lineHeight = node.depth === 1 ? 28 : node.depth === 2 ? 25 : 23;
  return (
    <Text selectable style={[textStyle(palette), { fontSize, fontWeight: "700", lineHeight }]}>
      {renderInlineChildren(node.children, palette)}
    </Text>
  );
}

function BlockquoteNode({ node, palette }: { node: Blockquote; palette: RendererPalette }) {
  return (
    <View style={{ maxWidth: "100%", gap: 6, borderLeftWidth: 3, borderLeftColor: palette.border, backgroundColor: palette.quoteBackground, paddingLeft: 10, paddingVertical: 6 }}>
      {node.children.map((child, index) => (isBlockContent(child) ? renderBlockNode(child, index, palette) : null))}
    </View>
  );
}

function ListNode({ node, palette }: { node: List; palette: RendererPalette }) {
  return (
    <View style={{ maxWidth: "100%", gap: 5 }}>
      {node.children.map((child, index) => (
        <ListItemNode key={index} index={index} node={child} ordered={Boolean(node.ordered)} palette={palette} start={node.start ?? 1} />
      ))}
    </View>
  );
}

function ListItemNode({ index, node, ordered, palette, start }: { index: number; node: ListItem; ordered: boolean; palette: RendererPalette; start: number }) {
  const marker = typeof node.checked === "boolean" ? (node.checked ? "[x]" : "[ ]") : ordered ? `${start + index}.` : "•";
  return (
    <View style={{ maxWidth: "100%", flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
      <Text style={[textStyle(palette), { minWidth: ordered ? 22 : 14, fontWeight: "600" }]}>{marker}</Text>
      <View style={{ minWidth: 0, flex: 1, gap: 5 }}>
        {node.children.map((child, childIndex) => (isBlockContent(child) ? renderBlockNode(child, childIndex, palette) : null))}
      </View>
    </View>
  );
}

function CodeNode({ node, palette }: { node: Code; palette: RendererPalette }) {
  return (
    <View style={{ maxWidth: "100%", overflow: "hidden", borderWidth: 1, borderColor: palette.border, borderRadius: 6, backgroundColor: palette.codeBackground }}>
      {node.lang ? (
        <View style={{ borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>{node.lang}</Text>
        </View>
      ) : null}
      <View style={{ maxWidth: "100%", padding: 10 }}>
        <Text selectable style={{ color: palette.foreground, fontFamily: "monospace", fontSize: 13, lineHeight: 19 }}>
          {node.value}
        </Text>
      </View>
    </View>
  );
}

function TableNode({ node, palette }: { node: Table; palette: RendererPalette }) {
  return (
    <View style={{ maxWidth: "100%", borderWidth: 1, borderColor: palette.border, borderRadius: 6, overflow: "hidden" }}>
      {node.children.map((row, rowIndex) => (
        <View key={rowIndex} style={{ borderTopWidth: rowIndex === 0 ? 0 : 1, borderTopColor: palette.border }}>
          {row.children.map((cell, cellIndex) => (
            <View key={cellIndex} style={{ paddingHorizontal: 8, paddingVertical: 7, borderTopWidth: cellIndex === 0 ? 0 : 1, borderTopColor: palette.border }}>
              <Text selectable style={{ color: palette.foreground, fontSize: 13, fontWeight: rowIndex === 0 ? "700" : "400", lineHeight: 18 }}>
                {plainTextFromNode(cell)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ThematicBreakNode({ palette }: { node: ThematicBreak; palette: RendererPalette }) {
  return <View style={{ height: 1, maxWidth: "100%", backgroundColor: palette.border }} />;
}

function PlainText({ content, palette }: { content: string; palette: RendererPalette }) {
  return (
    <Text selectable style={textStyle(palette)}>
      {content}
    </Text>
  );
}

function renderInlineChildren(children: PhrasingContent[], palette: RendererPalette) {
  return children.map((child, index) => <Fragment key={index}>{renderInlineNode(child, palette)}</Fragment>);
}

function isBlockContent(node: unknown): node is BlockContent {
  if (!node || typeof node !== "object") {
    return false;
  }
  const type = (node as { type?: string }).type;
  return type === "blockquote" || type === "code" || type === "heading" || type === "html" || type === "list" || type === "paragraph" || type === "table" || type === "thematicBreak";
}

function renderInlineNode(node: PhrasingContent, palette: RendererPalette): ReactNode {
  switch (node.type) {
    case "break":
      return "\n";
    case "delete":
      return <DeleteNode node={node} palette={palette} />;
    case "emphasis":
      return <EmphasisNode node={node} palette={palette} />;
    case "html":
      return null;
    case "inlineCode":
      return <InlineCodeNode node={node} palette={palette} />;
    case "link":
      return <LinkNode node={node} palette={palette} />;
    case "strong":
      return <StrongNode node={node} palette={palette} />;
    case "text":
      return (node as MarkdownText).value;
    default:
      return plainTextFromNode(node);
  }
}

function StrongNode({ node, palette }: { node: Strong; palette: RendererPalette }) {
  return <Text style={{ color: palette.foreground, fontWeight: "700" }}>{renderInlineChildren(node.children, palette)}</Text>;
}

function EmphasisNode({ node, palette }: { node: Emphasis; palette: RendererPalette }) {
  return <Text style={{ color: palette.foreground, fontStyle: "italic" }}>{renderInlineChildren(node.children, palette)}</Text>;
}

function DeleteNode({ node, palette }: { node: Delete; palette: RendererPalette }) {
  return <Text style={{ color: palette.muted, textDecorationLine: "line-through" }}>{renderInlineChildren(node.children, palette)}</Text>;
}

function InlineCodeNode({ node, palette }: { node: InlineCode; palette: RendererPalette }) {
  return <Text style={{ color: palette.foreground, backgroundColor: palette.codeBackground, fontFamily: "monospace", fontSize: 14 }}>{node.value}</Text>;
}

function LinkNode({ node, palette }: { node: Link; palette: RendererPalette }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => void openSafeLink(node.url)}>
      <Text style={{ color: palette.link, textDecorationLine: "underline" }}>{renderInlineChildren(node.children, palette)}</Text>
    </Pressable>
  );
}

function textStyle(palette: RendererPalette): TextStyle {
  return {
    color: palette.foreground,
    fontSize: 16,
    lineHeight: 24
  };
}

type MarkdownNode = {
  value?: string;
  children?: MarkdownNode[];
};

function plainTextFromNode(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }
  const item = node as MarkdownNode;
  if (typeof item.value === "string") {
    return item.value;
  }
  return item.children?.map(plainTextFromNode).join("") ?? "";
}

async function openSafeLink(url: string) {
  if (!isSafeUrl(url)) {
    return;
  }
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  }
}

function isSafeUrl(value: string) {
  try {
    return allowedLinkProtocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
}
