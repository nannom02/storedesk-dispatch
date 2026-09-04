import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function anonymizeLockedProposalCopy(): Plugin {
  return {
    name: "anonymize-locked-proposal-copy",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/out/safedesk-master/ProposalExplanationScreens.tsx")) return null;

      return {
        code: code.replaceAll("엠소프텍", "제안사"),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [anonymizeLockedProposalCopy(), react()],
  preview: {
    host: "127.0.0.1",
  },
});
