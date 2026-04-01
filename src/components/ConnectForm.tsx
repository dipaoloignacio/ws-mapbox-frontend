import type { FormEvent } from "react";
import "./ConnectForm.css";

interface Props {
  onSubmit: (name: string, color: string) => void;
}

export const ConnectForm = ({ onSubmit }: Props) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const color = formData.get("color") as string;

    if (!name || !color) return;

    onSubmit(name, color);
  };

  return (
    <form className="connect-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Nombre</label>
        <input type="text" id="name" name="name" required />
      </div>

      <div className="form-group">
        <label htmlFor="color">Color</label>
        <input type="color" id="color" name="color" />
      </div>

      <button type="submit">Conectar</button>
    </form>
  );
};
