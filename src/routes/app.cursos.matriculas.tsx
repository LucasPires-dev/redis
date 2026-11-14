import { createFileRoute } from "@tanstack/react-router";
import { MyEnrollments } from "@/components/courses/MemberCourses";

// "Minhas matrículas": the person's own enrollments. Everyone sees it.
export const Route = createFileRoute("/app/cursos/matriculas")({
  head: () => ({ meta: [{ title: "Minhas matrículas — Redis" }] }),
  component: MyEnrollments,
});
