import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { wordStats } from "@/lib/vault/html";
import { clipboardGuard } from "@/lib/vault/clipboard";
import { useVaultStore } from "@/stores/vault-store";
import type { VaultNode } from "@/lib/vault/types";

export function DocumentEditor({ node }: { node: VaultNode }) {
  const readonly = useVaultStore((s) => s.readonly);
  const canvas = useVaultStore((s) => s.settings.canvas);
  const timeout = useVaultStore((s) => s.settings.clipboardTimeout);
  const updateContent = useVaultStore((s) => s.updateContent);
  const editorNonce = useVaultStore((s) => s.editorNonce);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, autolink: true }),
        Placeholder.configure({ placeholder: "开始书写，或按 Ctrl/⌘ K 打开命令面板…" }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        CharacterCount,
        Typography,
      ],
      content: node.content || "<p></p>",
      editable: !readonly,
      editorProps: {
        attributes: { class: "mixia-editor" },
        handleDOMEvents: {
          copy: () => {
            const text = window.getSelection()?.toString() || "";
            if (text) void clipboardGuard.arm(text, timeout);
            return false;
          },
        },
      },
      onUpdate: ({ editor: ed }) => {
        updateContent(node.id, ed.getHTML(), false);
      },
      onBlur: ({ editor: ed }) => {
        updateContent(node.id, ed.getHTML(), true);
      },
    },
    [node.id, editorNonce],
  );

  useEffect(() => {
    editor?.setEditable(!readonly);
  }, [editor, readonly]);

  const style =
    canvas.bg && canvas.fg
      ? { backgroundColor: canvas.bg, color: canvas.fg }
      : undefined;

  if (!editor) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">载入编辑器…</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!readonly && <EditorToolbar editor={editor} />}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto min-h-full max-w-3xl px-5 py-8 sm:px-10" style={style}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <EditorStatus editor={editor} node={node} />
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    editor.on("selectionUpdate", fn);
    editor.on("transaction", fn);
    return () => {
      editor.off("selectionUpdate", fn);
      editor.off("transaction", fn);
    };
  }, [editor]);

  const on = (active: boolean) => cn("size-8", active && "bg-primary/15 text-primary");

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <IconBtn label="撤销" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 />
      </IconBtn>
      <IconBtn label="重做" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 />
      </IconBtn>
      <Sep />
      <IconBtn label="标题 1" className={on(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 />
      </IconBtn>
      <IconBtn label="标题 2" className={on(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </IconBtn>
      <IconBtn label="加粗" className={on(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </IconBtn>
      <IconBtn label="斜体" className={on(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </IconBtn>
      <IconBtn label="下划线" className={on(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon />
      </IconBtn>
      <IconBtn label="删除线" className={on(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough />
      </IconBtn>
      <IconBtn label="高亮" className={on(editor.isActive("highlight"))} onClick={() => editor.chain().focus().toggleHighlight({ color: "#fff566" }).run()}>
        <Highlighter />
      </IconBtn>
      <LinkControl editor={editor} />
      <Sep />
      <IconBtn label="无序列表" className={on(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </IconBtn>
      <IconBtn label="有序列表" className={on(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </IconBtn>
      <IconBtn label="任务清单" className={on(editor.isActive("taskList"))} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListTodo />
      </IconBtn>
      <IconBtn label="引用" className={on(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </IconBtn>
      <IconBtn label="代码块" className={on(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code />
      </IconBtn>
      <Sep />
      <IconBtn label="左对齐" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft />
      </IconBtn>
      <IconBtn label="居中" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter />
      </IconBtn>
      <IconBtn label="右对齐" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  className,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  label: string;
}) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" className={cn("size-8", className)} onClick={onClick} title={label} aria-label={label}>
      {children}
    </Button>
  );
}

function Sep() {
  return <Separator orientation="vertical" className="mx-1 h-5" />;
}

function LinkControl({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState(editor.getAttributes("link").href || "https://");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("size-8", editor.isActive("link") && "bg-primary/15 text-primary")}
          title="链接"
        >
          <Link2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().unsetLink().run()}>
            移除
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const href = url.trim();
              if (!href) return;
              editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
            }}
          >
            应用
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EditorStatus({ editor, node }: { editor: Editor; node: VaultNode }) {
  const saving = useVaultStore((s) => s.saving);
  const dirty = useVaultStore((s) => s.dirty);
  const clipboardLeft = useVaultStore((s) => s.clipboardLeft);
  const html = editor.getHTML();
  const stats = useMemo(() => wordStats(html), [html]);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
      <span className="tabular-nums">{stats.chars} 字</span>
      <span className="tabular-nums">约 {stats.minutes} 分钟阅读</span>
      <span className="hidden sm:inline">UTF-8 · 富文本</span>
      <span className="ml-auto tabular-nums">
        {clipboardLeft > 0
          ? `剪贴板将在 ${clipboardLeft}s 后清除`
          : saving
            ? "正在写入金库…"
            : dirty
              ? "未保存"
              : "已加密保存"}
      </span>
      <span className="hidden md:inline">{node.updatedAt}</span>
    </div>
  );
}
