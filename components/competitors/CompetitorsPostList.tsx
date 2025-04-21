"use client";

import { FC, useState } from "react";
import { FaEarthAfrica } from "react-icons/fa6";
import {
  Table,
  Pagination,
  TextInput,
  Select,
  Dropdown,
  Button,
} from "flowbite-react";
import PostCard from "./CompetitorsPostCard";

const AllPosts: FC = () => {
  // Search Value
  const [searchQuery, setSearchQuery] = useState("");
  // Sort Order
  const [sortOrder, setSortOrder] = useState("asc");
  // Total Page
  const [totalPages, setTotalPages] = useState(1);
  // Current Page
  const [currentPage, setCurrentPage] = useState(1);
  // List Data
  const [listData, setListData] = useState([
    {
      showDate: "Jun 1 - 11:00PM",
      date: "2025-06-01 11:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: true,
      url: "#",
    },
    {
      showDate: "Jun 1 - 10:00PM",
      date: "2025-06-01 10:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample postThis is a sample postThis is a sample postThis is a sample postThis is a sample postThis is a sample postThis is a sample postThis is a sample postThis is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: true,
      url: "#",
    },
    {
      showDate: "Jun 1 - 11:00PM",
      date: "2025-06-01 11:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: true,
      url: "#",
    },
    {
      showDate: "Jun 1 - 11:00PM",
      date: "2025-06-01 11:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: false,
      url: "#",
    },
    {
      showDate: "Jun 1 - 11:00PM",
      date: "2025-06-01 11:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: true,
      url: "#",
    },
    {
      showDate: "Jun 1 - 11:00PM",
      date: "2025-06-01 11:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: false,
      url: "#",
    },
    {
      showDate: "Jun 1 - 11:00PM",
      date: "2025-06-01 11:00",
      platform: "Rednote",
      nickname: "username",
      post: "This is a sample post",
      taglist: "#Tag, #Thailand, #Deep",
      relvance: 80,
      sentiment: "Positive",
      hasCriticism: false,
      url: "#",
    },
  ]);
  // Select Competitor Data
  const competitorList = [
    "Competitor_1",
    "Competitor_2",
    "Competitor_3",
    "Competitor_4",
  ];
  const [competitor, setCompetitor] = useState("Competitor_1");

  // Select Platform Data
  const platformData = ["Douyin", "Rednote", "Weibo"];
  const [platform, setPlatform] = useState("Rednote");
  const handlePlatform = (data: string) => {
    setPlatform(data);
  };
  // Start Date Data
  const [startDate, setStartDate] = useState("");
  // End Date Data
  const [endDate, setEndDate] = useState("");
  // Select sentiment Data
  const sentimentData = ["Positive", "Negative"];
  const [sentiment, setSentiment] = useState("");
  const handleSentiment = (data: string) => {
    setSentiment(data);
  };
  // Select relevance Data
  const relevanceData = ["50%", "60%", "70%", "80%", "90%", "100%"];
  const [relevance, setRelevance] = useState("");
  const handleRelevance = (data: string) => {
    setRelevance(data);
  };
  // Select criticism Data
  const criticismData = ["Has Criticism", "No Criticism"];
  const [criticism, setCriticism] = useState("");
  const handleCriticism = (data: string) => {
    setCriticism(data);
  };

  // Control Modal Display
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowData, setRowData] = useState({});
  const openModal = (item: Object) => {
    setRowData(item);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  // Data Logical
  const handleCompetitor = (data: string) => {
    // Request API Below
    // Change value
    setCompetitor(data);
  };

  const handleSearch = () => {
    console.log("Search content:", searchQuery);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    console.log(`Jump to page ${page}`);
  };

  const sortPostsByDate = (data: string) => {
    const sortedPosts = [...listData].sort((a, b) =>
      data === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setListData(sortedPosts);
    setSortOrder(data);
  };

  return (
    <div className="bg-white relative">
      {/* Head */}
      <h1 className="text-[34px] font-bold text-[#5D5FEF] mb-9">
        {competitor}
      </h1>

      {/* First Row Components */}
      <div className="flex space-x-4">
        <Select
          id="competitor"
          required
          value={competitor}
          onChange={(e) => handleCompetitor(e.target.value)}
        >
          {competitorList.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Start Date</span>
          <TextInput
            type="date"
            id="start-date"
            placeholder="Start Date"
            required
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">End Date</span>
          <TextInput
            type="date"
            id="end-date"
            placeholder="End Date"
            required
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <Select
          id="platform"
          value={platform}
          required
          onChange={(e) => handlePlatform(e.target.value)}
        >
          {platformData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
      </div>

      {/* Second Row Components */}
      <div className="flex mt-4 space-x-4">
        <Select
          id="sentiment"
          required
          value={sentiment}
          onChange={(e) => handleSentiment(e.target.value)}
        >
          {sentimentData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <Select
          id="relevance"
          required
          value={relevance}
          onChange={(e) => handleRelevance(e.target.value)}
        >
          {relevanceData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <Select
          id="criticism"
          required
          value={criticism}
          onChange={(e) => handleCriticism(e.target.value)}
        >
          {criticismData.map((item, index) => {
            return <option key={index}>{item}</option>;
          })}
        </Select>
        <TextInput
          type="text"
          id="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onBlur={handleSearch}
        />
      </div>

      {/* Table */}
      <div className="mt-6 bg-white rounded shadow">
        <Table hoverable>
          <Table.Head>
            <Table.HeadCell className="flex">
              Date
              <div className="pl-2">
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 6 4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => sortPostsByDate("asc")}
                  className=""
                >
                  <path
                    d="M1.08711 4L4.91289 4C5.34007 4 5.57052 3.49894 5.29252 3.1746L3.37963 0.942899C3.18008 0.710094 2.81992 0.710094 2.62037 0.942899L0.707482 3.1746C0.429479 3.49894 0.659934 4 1.08711 4Z"
                    fill={sortOrder === "asc" ? "#5D5FEF" : "#A5A6F6"}
                  />
                </svg>
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 6 4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => sortPostsByDate("desc")}
                >
                  <path
                    d="M4.91289 0H1.08711C0.659934 0 0.429479 0.501059 0.707482 0.825396L2.62037 3.0571C2.81992 3.28991 3.18008 3.28991 3.37963 3.0571L5.29252 0.825396C5.57052 0.501059 5.34007 0 4.91289 0Z"
                    fill={sortOrder === "desc" ? "#5D5FEF" : "#A5A6F6"}
                  />
                </svg>
              </div>
            </Table.HeadCell>
            <Table.HeadCell>Platform</Table.HeadCell>
            <Table.HeadCell>Nickname</Table.HeadCell>
            <Table.HeadCell>Post</Table.HeadCell>
            <Table.HeadCell>Taglist</Table.HeadCell>
            <Table.HeadCell>View Original</Table.HeadCell>
            <Table.HeadCell>Relevance</Table.HeadCell>
            <Table.HeadCell>Sentiment</Table.HeadCell>
            <Table.HeadCell>Criticism</Table.HeadCell>
            <Table.HeadCell>Original URL</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {listData.map((item, index) => {
              return (
                <Table.Row key={index}>
                  <Table.Cell className="text-[#DD9A19]">
                    {item.showDate}
                  </Table.Cell>
                  <Table.Cell>{item.platform}</Table.Cell>
                  <Table.Cell>{item.nickname}</Table.Cell>
                  <Table.Cell className="truncate max-w-40 whitespace-nowrap overflow-hidden">
                    {item.post}
                  </Table.Cell>
                  <Table.Cell className="truncate max-w-40 whitespace-nowrap overflow-hidden">
                    {item.taglist}
                  </Table.Cell>
                  <Table.Cell className="flex justify-center items-center">
                    <button
                      className="text-white text-xs bg-[#5D5FEF] shadow-sm w-[69px] h-[32px] justify-center items-center border rounded"
                      onClick={() => openModal(item)}
                    >
                      Original
                    </button>
                  </Table.Cell>
                  <Table.Cell>{item.relvance}</Table.Cell>
                  <Table.Cell>{item.sentiment}</Table.Cell>
                  <Table.Cell>
                    {item.hasCriticism ? (
                      <span className="bg-red-100 text-red-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-red-900 dark:text-red-300">
                        Criticism
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded-sm dark:bg-green-900 dark:text-green-300">
                        All Well
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="flex justify-center items-center">
                    <FaEarthAfrica className="cursor-pointer w-6 h-6 text-[#5D5FEF]"></FaEarthAfrica>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
        <PostCard
          isOpen={isModalOpen}
          onClose={closeModal}
          rowData={rowData}
        ></PostCard>
      </div>
      {/* Pagination */}
      <div className="flex justify-center w-full h-auto mt-3">
        <div className="flex space-x-4">
          <span className="py-2">Page</span>
          {/* Left Arrow */}

          <button
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="bg-transparent text-white p-2"
          >
            <svg
              width="18"
              height="20"
              viewBox="0 0 4 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.5 4.91289L3.5 1.08711C3.5 0.659934 2.99894 0.429479 2.6746 0.707482L0.4429 2.62037C0.210094 2.81992 0.210094 3.18008 0.4429 3.37963L2.6746 5.29252C2.99894 5.57052 3.5 5.34007 3.5 4.91289Z"
                fill={currentPage <= 1 ? "#A5A6F6" : "#5D5FEF"}
              />
            </svg>
          </button>

          {/* Current Page */}
          <div className="bg-[#5D5FEF] text-white rounded-full w-10 h-10 text-[20px] text-center py-1">
            {currentPage}
          </div>

          {/* Right Arrow */}
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="bg-transparent text-white p-2"
          >
            <svg
              width="18"
              height="20"
              viewBox="0 0 4 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0.5 1.08711L0.5 4.91289C0.5 5.34007 1.00106 5.57052 1.3254 5.29252L3.5571 3.37963C3.78991 3.18008 3.78991 2.81992 3.5571 2.62037L1.3254 0.707482C1.00106 0.429479 0.5 0.659934 0.5 1.08711Z"
                fill={currentPage >= totalPages ? "#A5A6F6" : "#5D5FEF"}
              />
            </svg>
          </button>

          {/* Page Choose Select 7 Row for 1 page */}
          <Select id="pageSelect">
            {[...Array(totalPages)].map((_, index) => (
              <option key={index} onClick={() => handlePageChange(index + 1)}>
                {index + 1}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AllPosts;
