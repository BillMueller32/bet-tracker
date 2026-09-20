"use client";

export function DeleteBetButton({
  deleteAction,
}: {
  deleteAction: (formData: FormData) => void;
}) {
  return (
    <form
      action={deleteAction}
      className="mt-4"
      onSubmit={(e) => {
        if (!window.confirm("Delete this bet? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md px-2 py-2 text-sm font-medium text-red-400 hover:text-red-300"
      >
        Delete this bet
      </button>
    </form>
  );
}
