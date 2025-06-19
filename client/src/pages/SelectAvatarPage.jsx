import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function SelectAvatarPage() {
  const [avatars, setAvatars] = useState([]);  // array of numbers
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/profile/avatars")
      .then(res => {
        // avatars: [1,2,3,4,...]
        setAvatars(res.data.avatars);
      })
      .catch(console.error);
  }, []);

  const handleConfirm = () => {
    if (selected === null) {
      return alert("Please choose an avatar.");
    }
    api
      .put("/profile/avatar", { avatarId: selected })
      .then(res => {
        // backend returns { avatarUrl: "http://…/assets/avatars/3.jpg" }
        navigate("/chat");
      })
      .catch(err => {
        console.error(err.response?.data || err);
        alert("Failed to save avatar.");
      });
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Choose Your Avatar</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {avatars.map(id => {
          const url = `http://localhost:5000/assets/avatars/${id}.jpg`;
          return (
            <img
              key={id}
              src={url}
              alt={`Avatar ${id}`}
              className={`w-20 h-20 rounded-full cursor-pointer border-4 transition ${
                selected === id ? "border-green-500" : "border-transparent"
              }`}
              onClick={() => setSelected(id)}
            />
          );
        })}
      </div>
      <button
        onClick={handleConfirm}
        className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Confirm Avatar
      </button>
    </div>
  );
}
