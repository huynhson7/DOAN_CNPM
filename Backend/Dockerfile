# ===== Stage 1: Build & Publish =====
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj trước để tận dụng cache layer của Docker khi restore package
COPY Backend.csproj ./
RUN dotnet restore "Backend.csproj"

# Copy toàn bộ source code còn lại rồi publish bản Release
COPY . .
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ===== Stage 2: Runtime (image nhẹ, không chứa SDK) =====
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Lắng nghe HTTP nội bộ trên cổng 5129 - khớp với cổng Frontend đang gọi cứng
# (http://localhost:5129) trong các file .js, để không phải sửa Frontend.
ENV ASPNETCORE_URLS=http://+:5129
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 5129

ENTRYPOINT ["dotnet", "Backend.dll"]
