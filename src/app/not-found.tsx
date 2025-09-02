export default function NotFound() {
  return (
    <div className="p-10 text-center space-y-4">
      <div className="text-3xl font-bold">Page not found</div>
      <p className="text-muted-foreground">
        The page you are looking for doesn’t exist. Use the left menu to find a
        tool, or return to the home screen.
      </p>
      <a href="/" className="underline">
        Go back home
      </a>
    </div>
  );
}
