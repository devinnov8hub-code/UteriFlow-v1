import logo from "../assets/uteriflow-drop.svg";
import { Link } from "react-router";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const menu = [
    { name: "Home", url: "/" },
    { name: "About", url: "/about" },
    { name: "Articles", url: "/articles" },
    // { name: "Contact" , url: "/home" },
  ];
  return (
    <main className="flex justify-between items-center bg-transparent backdrop-blur-md z-20 fixed top-0 right-0 left-0 px-4 sm:px-8 py-4 sm:py-6 border-b border-white/20 ">
      <div className="logo flex items-center ">
        <img src={logo} alt="logo" className="h-8 sm:h-10 w-8 sm:w-10" />
        <h1 className="text-lg sm:text-2xl px-2 text-primary-color font-bold drop-shadow-lg">{title}</h1>
      </div>
      <nav className="nav-menu flex font-medium text-sm sm:text-lg text-primary-color hover:text-secondary-color transition cursor-pointer gap-2 sm:gap-4">
        {menu.map((item, index) => (
          <ul key={index}>
            <li>
              <Link
                to={item.url}
                className="hover:text-secondary-color transition px-2 sm:px-4 py-2"
              >
                {item.name}
              </Link>
            </li>
          </ul>
        ))}
      </nav>
    </main>
  );
}
