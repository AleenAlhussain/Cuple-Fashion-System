"use client";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import { useRouter, redirect } from "next/navigation";
import { useSearchParams } from "next/navigation";

const Pagination = ({ current_page, total, per_page, setPage }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSearchParams = (params) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      newParams.set(key, value);
    });
    router.push(`?${newParams.toString()}`);
  };
  let pages = [];
  let totalPages = Math.ceil(total / per_page);
  let startpage =
    totalPages === 4
      ? 1
      : current_page === 1 || current_page - 2 === 0
      ? 1
      : current_page === totalPages
      ? current_page - 2
      : current_page - 1;
  let endPage =
    totalPages === 4
      ? 4
      : current_page === 1
      ? current_page + 2
      : current_page + 1 <= totalPages
      ? current_page + 1
      : current_page;
  for (let i = startpage; i <= endPage; i++) {
    i <= totalPages && pages.push(i);
  }
  return (
    <>
      {total / per_page > 1 ? (
        <ul className="pagination">
          <li className={`page-item ${current_page === 1 ? "disabled" : ""}`}>
            <a
              className="page-link"
              onClick={() => {
                setSearchParams({ page: current_page - 1 });
              }}
            >
              <RiArrowLeftSLine />
            </a>
          </li>
          {totalPages - 2 <= current_page && totalPages > 4 && (
            <>
              <li className="page-item">
                <a
                  className="page-link"
                  onClick={() => setSearchParams({ page: 1 })}
                >
                  1
                </a>
              </li>
              <li className="page-item">
                <a className="page-link ">...</a>
              </li>
            </>
          )}
          {pages.map((i) => (
            <li
              className={`page-item ${
                current_page === i ? "active disabled" : ""
              }`}
              key={i}
            >
              <a
                className={`page-link `}
                onClick={() => setSearchParams({ page: i })}
              >
                {i}
              </a>
            </li>
          ))}
          {current_page + 1 < totalPages && totalPages > 4 && (
            <>
              {current_page + 2 < totalPages && (
                <li className="page-item ">
                  <a className="page-link ">...</a>
                </li>
              )}
              <li className="page-item ">
                <a
                  className="page-link"
                  onClick={() => setSearchParams({ page: totalPages })}
                >
                  {totalPages}
                </a>
              </li>
            </>
          )}

          <li
            className={`page-item ${
              current_page === totalPages ? "disabled" : ""
            }`}
          >
            <a
              className="page-link"
              onClick={() => {
                setSearchParams({ page: current_page + 1 });
              }}
            >
              <RiArrowRightSLine />
            </a>
          </li>
        </ul>
      ) : (
        <ul className="pagination justify-content-center">
          <li className={`page-item disabled`}>
            <a className="page-link">
              <RiArrowLeftSLine />
            </a>
          </li>
          <li className="page-item ">
            <a className={`page-link active`}>1</a>
          </li>
          <li className={`page-item disabled`}>
            <a className="page-link">
              <RiArrowRightSLine />
            </a>
          </li>
        </ul>
      )}
    </>
  );
};

export default Pagination;
