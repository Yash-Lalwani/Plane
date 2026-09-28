import { CheckCircle2 } from "lucide-react";
import { Brand } from "./brand";
import { Avatar } from "./product-preview";

// Shared frame for login, register and the email-link pages (the original auth design).
export function AuthLayout({
  icon,
  title,
  description,
  notice,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-main">
        <Brand />
        <div className="auth-card">
          {notice}
          {icon && <div className="token-icon">{icon}</div>}
          <h1>{title}</h1>
          {description && <p className="auth-description">{description}</p>}
          {children}
        </div>
        <span className="auth-footer">A little structure. A lot of progress.</span>
      </section>
      <aside className="auth-art">
        <p className="eyebrow">YOUR WORK, IN A BETTER PLACE</p>
        <h2>
          One shared space.
          <br />
          So much possibility.
        </h2>
        <p>
          Bring the details together.
          <br />
          Give the big ideas room to grow.
        </p>
        <div className="auth-art-card">
          <span className="feature-number">WEBSITE RELAUNCH</span>
          <h3>Small steps. Real momentum.</h3>
          {["Set a clear direction", "Bring your team together", "Make something great"].map((text, index) => (
            <div className="auth-art-task" key={text}>
              <CheckCircle2 />
              {text}
              <Avatar name={["Yash Lalwani", "Priya Shah", "Alex Morgan"][index]} small />
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "info"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className={tone === "error" ? "form-error" : "token-state"} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
