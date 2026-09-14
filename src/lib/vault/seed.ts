import type { VaultNode } from "./types";
import { byteSize, previewOf } from "./html";

const STAMP = "2026-09-14 21:18:00";

function node(
  partial: Omit<VaultNode, "size" | "preview" | "versions" | "starred" | "inTrash" | "tags" | "createdAt" | "updatedAt"> &
    Partial<Pick<VaultNode, "starred" | "inTrash" | "tags" | "createdAt" | "updatedAt" | "versions" | "tint">>,
): VaultNode {
  const content = partial.content || "";
  return {
    starred: false,
    inTrash: false,
    tags: [],
    versions: [],
    createdAt: STAMP,
    updatedAt: STAMP,
    ...partial,
    content,
    preview: previewOf(content),
    size: byteSize(content),
  };
}

const WELCOME = `<h1>欢迎使用密匣</h1>
<p>密匣是本地优先的加密文档工作台。所有正文在写入磁盘前都会经过 <strong>AES-256-GCM</strong> 认证加密，密钥由 <strong>PBKDF2-HMAC-SHA256 · 100,000 次迭代</strong> 派生。数据只存在这台设备的浏览器里，不会上传。</p>
<h2>从这里开始</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>浏览左侧目录，点开任意一篇文档</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>按 <code>Ctrl/⌘ K</code> 打开命令面板，搜索文档或执行操作</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>在设置里为金库加上主密码，并选择自动锁定时间</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>试着导入一份 .txt / .md / .docx，或把当前文档导出为 Markdown</p></div></li>
</ul>
<h2>书写</h2>
<p>编辑器支持标题、任务清单、高亮、超链接、代码块与引用。右侧大纲会跟随标题生成。需要专注时打开禅模式；复制敏感内容后，剪贴板会按设定秒数自毁。</p>
<blockquote><p>演示金库里的样例可以随便改、删或粉碎。真正的秘密请在设置主密码后再写入。</p></blockquote>
<h2>安全边界</h2>
<p>没有密码时仍会加密，但密钥是本地默认口令，只防随手翻看。设置主密码后，锁定金库会从内存清除明文。忘记密码只能重置金库，密文无法恢复。</p>`;

const MEETING = `<h1>产品周会 · 9 月 14 日</h1>
<p><strong>时间</strong> 14:00–14:45　<strong>主持</strong> 林予安　<strong>记录</strong> 密匣</p>
<h2>出席</h2>
<ul><li><p>林予安、周衡、陈麦、何晓</p></li></ul>
<h2>议题</h2>
<ol>
<li><p>文档导入导出的格式覆盖</p></li>
<li><p>主密码与自动锁定的默认策略</p></li>
<li><p>下个迭代：版本快照与标签检索</p></li>
</ol>
<h2>决议</h2>
<ul>
<li><p>导入优先支持 txt / md / docx / html，导出补齐 markdown 与备份 JSON。</p></li>
<li><p>打开旧文档不再默认只读，避免演示时让人误以为不能编辑。</p></li>
</ul>
<h2>待办</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>何晓：补齐 Markdown 往返</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>周衡：命令面板加入「今日手记」</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>陈麦：回收站粉碎前二次确认</p></div></li>
</ul>`;

const ROADMAP = `<h1>密匣路线图</h1>
<p>把桌面端单体脚本拆成模块化工作台之后，下一阶段只做三件会改变手感的事。</p>
<h2>现在</h2>
<ul>
<li><p>树状目录、拖拽、全文检索</p></li>
<li><p>富文本 + 任务清单 + 大纲</p></li>
<li><p>加密落盘、剪贴板自毁、回收站粉碎</p></li>
</ul>
<h2>接下来</h2>
<ol>
<li><p>文档级版本时间线（已提供最近 8 次快照）</p></li>
<li><p>模板库与今日手记</p></li>
<li><p>金库备份 / 恢复</p></li>
</ol>
<h2>不做</h2>
<blockquote><p>不把正文同步到云端，也不做账号体系。密匣的默认假设是：这台设备是边界。</p></blockquote>`;

const CRYPTO = `<h1>金库加密说明</h1>
<p>实现与原先桌面端一致，只是把 PyQt / SQLite 换成了 Web Crypto 与 IndexedDB。</p>
<h2>密钥派生</h2>
<pre><code>PBKDF2-HMAC-SHA256
salt     16 bytes
rounds   100,000
output   256-bit AES key</code></pre>
<h2>正文保护</h2>
<ul>
<li><p>算法：AES-256-GCM</p></li>
<li><p>Nonce：12 字节随机数，每次写入重新生成</p></li>
<li><p>AAD：无。完整性由 GCM 标签保证</p></li>
</ul>
<h2>内存策略</h2>
<p>解锁后明文只留在当前标签页的内存里。点击锁定、自动锁定或关闭页面，状态机丢弃 CryptoKey 与文档数组。回收站里的节点同样加密保存；「彻底粉碎」会从数组删除并覆写存储。</p>
<blockquote><p>这不是防国家级对手的方案，而是让普通泄露路径（导出文件夹、共享电脑、剪贴板残留）失效。</p></blockquote>`;

const WEEKLY = `<h1>第 37 周复盘</h1>
<h2>完成了什么</h2>
<ul>
<li><p>把近三千行的桌面脚本拆成加密、解析、导出、目录与编辑器模块。</p></li>
<li><p>编辑器从纯 QTextEdit 换成可扩展的结构化写作。</p></li>
</ul>
<h2>卡住的地方</h2>
<ul><li><p>旧 .doc 二进制在浏览器里几乎无法忠实还原，导入时引导另存为 docx。</p></li></ul>
<h2>下周三件最重要的事</h2>
<ol>
<li><p>把命令面板做成真正的快速入口</p></li>
<li><p>给文件夹加上颜色标记</p></li>
<li><p>写一份给非技术用户的「忘记密码」说明</p></li>
</ol>`;

const JOURNAL = `<h1>雨夜</h1>
<p>把以前散落在备忘录、桌面 txt 和加密压缩包里的东西，收进同一个匣子。匣子不上锁的时候，它只是一只盒子；上了锁，它才成为密匣。</p>
<p>今晚先把工作区的会议记录搬进来。私人的信，等主密码设好再写。</p>
<blockquote><p>秘密的价值不在于藏得多深，而在于你还愿不愿意把它写下来。</p></blockquote>`;

const BRIEF_TPL = `<h1>项目简报</h1>
<p><em>用一句话写目标。</em></p>
<h2>背景</h2>
<p></p>
<h2>当前状态</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>已完成</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>进行中</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>未开始</p></div></li>
</ul>
<h2>风险</h2>
<ul><li><p></p></li></ul>
<h2>下一步</h2>
<ol><li><p></p></li></ol>`;

const MEETING_TPL = `<h1>会议纪要</h1>
<p><strong>时间</strong> · <strong>地点</strong> · <strong>主持</strong></p>
<h2>出席</h2>
<ul><li><p></p></li></ul>
<h2>议题</h2>
<ol><li><p></p></li></ol>
<h2>决议与待办</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>事项 · 负责人 · 截止日期</p></div></li>
</ul>`;

export const SEED_EXPANDED = ["fld-work", "fld-knowledge", "fld-personal", "fld-templates"];

export function createSeedDocuments(): VaultNode[] {
  return [
    node({
      id: "doc-welcome",
      type: "document",
      parentId: "",
      name: "欢迎使用密匣",
      content: WELCOME,
      starred: true,
      tags: ["指南"],
    }),
    node({
      id: "fld-work",
      type: "folder",
      parentId: "",
      name: "工作",
      content: "",
      tint: "blue",
      tags: [],
    }),
    node({
      id: "fld-knowledge",
      type: "folder",
      parentId: "",
      name: "知识库",
      content: "",
      tint: "teal",
      tags: [],
    }),
    node({
      id: "fld-personal",
      type: "folder",
      parentId: "",
      name: "私人",
      content: "",
      tint: "rose",
      tags: [],
    }),
    node({
      id: "fld-templates",
      type: "folder",
      parentId: "",
      name: "模板",
      content: "",
      tint: "amber",
      tags: [],
    }),
    node({
      id: "doc-meeting",
      type: "document",
      parentId: "fld-work",
      name: "产品周会纪要",
      content: MEETING,
      tags: ["工作", "会议"],
    }),
    node({
      id: "doc-roadmap",
      type: "document",
      parentId: "fld-work",
      name: "产品路线图",
      content: ROADMAP,
      starred: true,
      tags: ["工作"],
    }),
    node({
      id: "doc-crypto",
      type: "document",
      parentId: "fld-knowledge",
      name: "金库加密说明",
      content: CRYPTO,
      tags: ["安全", "加密"],
    }),
    node({
      id: "doc-weekly",
      type: "document",
      parentId: "fld-personal",
      name: "第 37 周复盘",
      content: WEEKLY,
      tags: ["复盘"],
    }),
    node({
      id: "doc-journal",
      type: "document",
      parentId: "fld-personal",
      name: "雨夜",
      content: JOURNAL,
      tags: ["手记"],
    }),
    node({
      id: "doc-brief-tpl",
      type: "document",
      parentId: "fld-templates",
      name: "模板 · 项目简报",
      content: BRIEF_TPL,
      tags: ["模板"],
    }),
    node({
      id: "doc-meeting-tpl",
      type: "document",
      parentId: "fld-templates",
      name: "模板 · 会议纪要",
      content: MEETING_TPL,
      tags: ["模板"],
    }),
  ];
}
