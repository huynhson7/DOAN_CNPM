# ===== Stage 1: Build =====
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj trước để tận dụng cache layer khi restore package
COPY Backend.csproj .
RUN dotnet restore "Backend.csproj"

# Copy toàn bộ source code còn lại rồi publish
COPY . .
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ===== Stage 2: Runtime (image nhỏ gọn, không có SDK) =====
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Backend.dll"]