import { useState } from "react";
import logo from "../assets/uteriflow-drop-white.svg";
import { type WaitlistForm } from "../types/waitlist";
import { CheckCircle, AlertCircle } from "lucide-react";

const FORM_INIT_URL = import.meta.env.VITE_FORM_INIT_URL;

type StatusType = "idle" | "loading" | "success" | "error";

const Waitlist = () => {
  const [formData, setFormData] = useState<WaitlistForm>({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusType>("idle");

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // clear error as user types
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validate();
    if (!isValid) return;

    setStatus("loading");

    try {
      const data = new FormData();
      data.append("fi-sender-firstName", formData.firstName);
      data.append("fi-sender-lastName", formData.lastName);
      data.append("fi-sender-email", formData.email);

      const response = await fetch(FORM_INIT_URL, {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
      });
      setErrors({});
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="bg-linear-to-br from-primary-color to-secondary-color flex flex-col justify-center items-center p-8 md:p-40 text-white min-h-screen">
      <img
        src={logo}
        alt="UteriFlow logo"
        className="h-16 w-16 md:h-20 md:w-20"
      />

      <h1 className="font-bold text-3xl md:text-4xl mt-2">UteriFlow</h1>
      <h2 className="text-xl md:text-2xl font-semibold">
        Our app is coming soon!
      </h2>

      <p className="text-center max-w-md text-gray-100 mt-2">
        Get early access to UteriFlow and be part of a community that
        prioritizes your wellness and privacy.
      </p>

      <div className="mt-10 bg-white rounded-lg p-8 w-full max-w-md shadow-2xl text-black">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* First Name */}
          <div>
            <input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First Name"
              className={`w-full p-3 rounded-lg border-2 ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <input
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last Name"
              className={`w-full p-3 rounded-lg border-2 ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              className={`w-full p-3 rounded-lg border-2 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-linear-to-br from-primary-color to-secondary-color text-white p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {status === "loading" ? "Joining..." : "Join Waitlist"}
          </button>

          {/* Success */}
          {status === "success" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 p-3 rounded text-green-700">
              <CheckCircle size={18} />
              <span>You're on the waitlist! 🎉</span>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 rounded text-red-700">
              <AlertCircle size={18} />
              <span>Something went wrong. Try again.</span>
            </div>
          )}
        </form>
      </div>

      <p className="text-sm text-gray-200 mt-6 text-center max-w-md">
        We respect your privacy. Your information will only be used to notify
        you when UteriFlow launches.
      </p>
    </div>
  );
};

export default Waitlist;
