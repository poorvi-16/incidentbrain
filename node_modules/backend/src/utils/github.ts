export function parseRepo(repoUrl: string) {
  const cleaned = repoUrl
    .replace("https://github.com/", "")
    .replace("http://github.com/", "")
    .replace(".git", "")
    .trim();

  const [owner, repo] = cleaned.split("/");

  if (!owner || !repo) {
    throw new Error("Repository must be in the format owner/repo");
  }

  return { owner, repo };
}
