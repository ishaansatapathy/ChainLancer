export default function AuthLayout({ children, story }) {
  return (
    <div className="auth-body">
      <div className="auth-split onboarding-split">
        <div className="auth-pane">{children}</div>
        <div className="auth-stage">
          <div className="auth-stage__grid" aria-hidden="true" />
          <div className="auth-stage__glow" aria-hidden="true" />
          <div className="auth-story">{story}</div>
        </div>
      </div>
    </div>
  );
}
