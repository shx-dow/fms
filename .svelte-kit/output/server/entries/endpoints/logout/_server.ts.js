import { redirect } from "@sveltejs/kit";
import { d as deleteSession } from "../../../chunks/auth.js";
const GET = ({ cookies }) => {
  deleteSession(cookies.get("session"));
  cookies.delete("session", { path: "/" });
  throw redirect(303, "/login");
};
export {
  GET
};
