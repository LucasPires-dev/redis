import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OpenClasses } from "@/components/courses/MemberCourses";

// "Disponíveis": classes open for members to enroll in. Everyone sees it.
export const Route = createFileRoute("/app/cursos/")({
  component: AvailableClasses,
});

function AvailableClasses() {
  const navigate = useNavigate();
  return <OpenClasses onEnrolled={() => navigate({ to: "/app/cursos/matriculas" })} />;
}
