import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import bash from "highlight.js/lib/languages/bash";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("hcl", bash);

type Props = {
  code: string;
  language: "yaml" | "markdown" | "hcl";
};

function CodeBlock({ code, language }: Props) {
  const highlighted = useMemo(() => {
    return hljs.highlight(code, { language }).value;
  }, [code, language]);

  return (
    <pre className="overflow-x-auto rounded-[28px] border border-white/10 bg-slate-950/90 p-5 text-[13px] leading-6">
      <code dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}

export default CodeBlock;
