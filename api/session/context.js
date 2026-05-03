export default function handler(request, response) {
  response.status(200).json({
    user: {
      id: "mock-user-employee",
      name: "吴经理",
      role: "employee",
      department_id: "dept-product",
      platform: request.query?.platform || "browser",
      platform_user_id: "mock_user_id",
    },
    permissions: ["expense:create", "expense:read:self"],
    locale: request.query?.locale || "zh-CN",
  });
}
