export interface DocTemplate {
  id: string;
  name: string;
  tags: string[];
  html: string;
}

export const TEMPLATES: DocTemplate[] = [
  {
    id: "blank",
    name: "空白文档",
    tags: [],
    html: "<p></p>",
  },
  {
    id: "meeting",
    name: "会议纪要",
    tags: ["工作", "模板"],
    html: `<h1>会议纪要</h1>
<p><strong>时间</strong> · <strong>地点</strong> · <strong>主持</strong></p>
<h2>出席</h2>
<ul><li><p></p></li></ul>
<h2>议题</h2>
<ol><li><p></p></li></ol>
<h2>决议与待办</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>跟进事项 · 负责人 · 截止日期</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li>
</ul>
<h2>备注</h2>
<blockquote><p>补充背景、未决议项或风险。</p></blockquote>`,
  },
  {
    id: "weekly",
    name: "周复盘",
    tags: ["复盘", "模板"],
    html: `<h1>本周复盘</h1>
<h2>完成了什么</h2>
<ul><li><p></p></li></ul>
<h2>卡住的地方</h2>
<ul><li><p></p></li></ul>
<h2>下周三件最重要的事</h2>
<ol><li><p></p></li><li><p></p></li><li><p></p></li></ol>
<h2>个人状态</h2>
<p>精力 / 睡眠 / 需要的支持</p>`,
  },
  {
    id: "brief",
    name: "项目简报",
    tags: ["工作", "模板"],
    html: `<h1>项目简报</h1>
<p><em>一句话目标</em></p>
<h2>背景</h2>
<p></p>
<h2>当前状态</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>已完成</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>进行中</p></div></li>
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>未开始</p></div></li>
</ul>
<h2>风险与依赖</h2>
<ul><li><p></p></li></ul>
<h2>下一步</h2>
<ol><li><p></p></li></ol>`,
  },
  {
    id: "reading",
    name: "阅读笔记",
    tags: ["知识", "模板"],
    html: `<h1>阅读笔记</h1>
<p><strong>来源</strong> · <strong>作者</strong> · <strong>日期</strong></p>
<h2>核心观点</h2>
<blockquote><p></p></blockquote>
<h2>金句</h2>
<ul><li><p></p></li></ul>
<h2>我的问题</h2>
<ol><li><p></p></li></ol>
<h2>可执行启发</h2>
<ul data-type="taskList">
<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li>
</ul>`,
  },
];
