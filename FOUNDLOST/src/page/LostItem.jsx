import React from "react";
import FormLostItem from "../component/FormLostItem";
import Navbar from "../component/Navbar";


const LostItem = () => {
  

  return (
    <div className="app-page-with-navbar">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-8">
      <FormLostItem/>
      </main>
    </div>
  );
};

export default LostItem;
