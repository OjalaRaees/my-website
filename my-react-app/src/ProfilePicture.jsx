/* function ProfilePicture(){
    const image= "/Bro.jpg";
    const remove=(e)=> e.target.style.display= "none";
    return(
        <img className="image" onClick={(e)=>{remove(e)}}  src= {image}></img>
    );
}
export default ProfilePicture





import React, { useState, useEffect } from "react";
import API from "../api";

function Profile({ token }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [newPic, setNewPic] = useState(null);

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const res = await API.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setName(res.data.name);
      setDescription(res.data.description);
      setProfilePic(res.data.profilePic);
    } catch (err) {
      console.log(err);
      alert("Failed to fetch profile");
    }
  };

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  // Update name & description
  const handleUpdate = async () => {
    try {
      const res = await API.put(
        "/profile",
        { name, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setName(res.data.name);
      setDescription(res.data.description);
      alert("Profile updated!");
    } catch (err) {
      console.log(err);
      alert("Update failed");
    }
  };

  // Update profile picture
  const handlePicUpload = async () => {
    if (!newPic) return;
    try {
      const formData = new FormData();
      formData.append("image", newPic);
      const res = await API.put("/profile/pic", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setProfilePic(res.data.profilePic);
      alert("Profile picture updated!");
    } catch (err) {
      console.log(err);
      alert("Profile pic upload failed");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow text-center">
        <div className="mb-3">
          <img
            src={profilePic ? `http://localhost:5000${profilePic}` : "/default-profile.png"}
            alt="Profile"
            className="rounded-circle"
            width="150"
            height="150"
          />
        </div>
        <div className="mb-3">
          <input type="file" accept="image/*" onChange={(e) => setNewPic(e.target.files[0])} />
          <button className="btn btn-primary mt-2" onClick={handlePicUpload}>
            + Change Picture
          </button>
        </div>
        <div className="mb-3">
          <input
            className="form-control mb-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
        </div>
        <button className="btn btn-success" onClick={handleUpdate}>
          Save Profile
        </button>
      </div>
    </div>
  );
}

export default Profile; */