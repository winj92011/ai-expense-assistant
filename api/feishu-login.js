export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    response.status(500).json({ error: "Feishu credentials are not configured" });
    return;
  }

  const { code } = request.body || {};
  if (!code) {
    response.status(400).json({ error: "Missing auth code" });
    return;
  }

  try {
    const appToken = await getAppAccessToken(appId, appSecret);
    const userToken = await getUserAccessToken(code, appToken);

    response.status(200).json({
      user: {
        name: userToken.name || "",
        enName: userToken.en_name || "",
        openId: userToken.open_id || "",
        unionId: userToken.union_id || "",
        userId: userToken.user_id || "",
        avatarUrl: userToken.avatar_thumb || userToken.avatar_url || "",
      },
    });
  } catch (error) {
    response.status(500).json({ error: error.message || "Feishu login failed" });
  }
}

async function getAppAccessToken(appId, appSecret) {
  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(data.msg || "Failed to get app_access_token");
  }

  return data.app_access_token;
}

async function getUserAccessToken(code, appAccessToken) {
  const res = await fetch("https://open.feishu.cn/open-apis/authen/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(data.msg || "Failed to get user_access_token");
  }

  return data.data || {};
}
